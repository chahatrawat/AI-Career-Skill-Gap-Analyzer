'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

// No key configured: every call must use the fallback and never touch the network.
delete process.env.GEMINI_API_KEY;
process.env.AI_MODEL = 'test-model';

const { explainSkillGap, generateRoadmap, __test } = require('./aiService');

const explainInput = {
  careerName: 'Python Developer',
  readinessScore: 60,
  skills: [
    { skillId: 1, name: 'SQL', currentLevel: 2, requiredLevel: 4, importance: 3, status: 'gap', gap: 2 },
    { skillId: 2, name: 'Git', currentLevel: 4, requiredLevel: 3, importance: 2, status: 'met', gap: 0 },
    { skillId: 3, name: 'Docker', currentLevel: null, requiredLevel: 2, importance: 1, status: 'missing', gap: 2 },
  ],
};

const roadmapInput = {
  careerName: 'Python Developer',
  weeklyHours: 6,
  gaps: [
    { skillId: 1, name: 'SQL', currentLevel: 2, requiredLevel: 4, importance: 3, gap: 2 },
    { skillId: 3, name: 'Docker', currentLevel: null, requiredLevel: 2, importance: 1, gap: 2 },
  ],
};

test('explainSkillGap falls back when no key is configured', async () => {
  const result = await explainSkillGap(explainInput);
  assert.equal(result.aiGenerated, false);
  assert.match(result.summary, /60% ready for Python Developer/);
  assert.deepEqual(result.priorities.map((p) => p.skillId), [1, 3]);
});

test('generateRoadmap falls back: one item per gap, titled by the template', async () => {
  const result = await generateRoadmap(roadmapInput);
  assert.equal(result.aiGenerated, false);
  const items = result.phases.flatMap((p) => p.items);
  assert.equal(items.length, 2);
  assert.equal(items[0].title, 'Improve SQL from level 2 to 4');
  assert.equal(items[1].title, 'Improve Docker from level 0 to 2');
});

test('fallback roadmap groups at most three items per phase', () => {
  const gaps = Array.from({ length: 7 }, (_, i) => ({
    skillId: i + 1, name: `S${i + 1}`, currentLevel: 1, requiredLevel: 3, importance: 2, gap: 2,
  }));
  const result = __test.fallbackRoadmap({ careerName: 'X', gaps });
  assert.deepEqual(result.phases.map((p) => p.items.length), [3, 3, 1]);
});

test('parseJsonText handles code fences and surrounding text', () => {
  assert.deepEqual(__test.parseJsonText('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(__test.parseJsonText('Here you go: {"a":1} done'), { a: 1 });
  assert.throws(() => __test.parseJsonText('not json'));
});

test('validateExplanation drops unknown skill IDs and caps at 5', () => {
  const raw = {
    summary: 'Short summary.',
    priorities: [
      { skillId: 99, reason: 'unknown id' },
      { skillId: 1, reason: 'valid' },
      { skillId: 1, reason: 'duplicate' },
      { skillId: 3, reason: 'valid too' },
    ],
  };
  const result = __test.validateExplanation(raw, explainInput);
  assert.equal(result.aiGenerated, true);
  assert.deepEqual(result.priorities.map((p) => p.skillId), [1, 3]);
});

test('validateExplanation rejects an empty summary', () => {
  assert.throws(() => __test.validateExplanation({ summary: '  ', priorities: [] }, explainInput));
});

test('validateRoadmap drops unknown IDs and adds any skill the AI left out', () => {
  const raw = {
    title: 'My plan',
    summary: 'Two sentences.',
    phases: [{ title: 'Start', items: [{ skillId: 1, title: 'Learn SQL', description: 'Practise joins.' }, { skillId: 42, title: 'Ghost' }] }],
  };
  const result = __test.validateRoadmap(raw, roadmapInput);
  const ids = result.phases.flatMap((p) => p.items.map((i) => i.skillId));
  assert.deepEqual(ids.sort(), [1, 3]);
  assert.equal(result.title, 'My plan');
});

test('validateRoadmap rejects more than five phases', () => {
  const phase = { title: 'P', items: [{ skillId: 1, title: 't', description: 'd' }] };
  assert.throws(() => __test.validateRoadmap({ phases: Array(6).fill(phase) }, roadmapInput));
});

test('explainSkillGap uses a mocked provider answer when configured', async () => {
  process.env.GEMINI_API_KEY = 'real-looking-key';
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: '{"summary":"Mocked.","priorities":[{"skillId":1,"reason":"Core skill."}]}' }] } }],
    }),
  });
  try {
    const result = await explainSkillGap(explainInput);
    assert.equal(result.aiGenerated, true);
    assert.equal(result.summary, 'Mocked.');
  } finally {
    global.fetch = originalFetch;
    delete process.env.GEMINI_API_KEY;
  }
});

test('a provider error falls back instead of throwing', async () => {
  process.env.GEMINI_API_KEY = 'real-looking-key';
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
  try {
    const result = await generateRoadmap(roadmapInput);
    assert.equal(result.aiGenerated, false);
  } finally {
    global.fetch = originalFetch;
    delete process.env.GEMINI_API_KEY;
  }
});
