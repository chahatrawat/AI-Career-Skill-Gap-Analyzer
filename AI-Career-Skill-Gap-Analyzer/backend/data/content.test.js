'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { BANK: QUIZ } = require('./quizBank');
const { BANK: RESOURCES } = require('./resourceBank');
const { resourcesFor } = require('../services/resourceService');
const { rateProject } = require('../services/projectService');
const { __test: ai } = require('../services/aiService');

// Skill slugs straight from seed.sql, so the banks cannot drift from the database.
const seed = fs.readFileSync(path.join(__dirname, '..', 'database', 'seed.sql'), 'utf8');
const slugs = [...seed.matchAll(/^\s*\(\d+, '[^']+', '([a-z0-9-]+)', '[^']+', /gm)].map((m) => m[1]);

test('seed.sql yields the 33 skill slugs', () => {
  assert.equal(slugs.length, 33);
});

test('every skill has a quiz with valid answer indexes', () => {
  for (const slug of slugs) {
    assert.ok(QUIZ[slug] && QUIZ[slug].length >= 3, `quiz missing for ${slug}`);
    for (const [prompt, options, correct] of QUIZ[slug]) {
      assert.ok(prompt && options.length >= 2, `${slug}: bad question`);
      assert.ok(Number.isInteger(correct) && correct >= 0 && correct < options.length, `${slug}: bad answer index`);
    }
  }
});

test('every skill has curated https resources with a known type', () => {
  const types = new Set(['docs', 'video', 'course', 'practice', 'interactive']);
  for (const slug of slugs) {
    assert.ok(RESOURCES[slug] && RESOURCES[slug].length >= 2, `resources missing for ${slug}`);
    for (const r of RESOURCES[slug]) {
      assert.ok(r.title);
      assert.match(r.url, /^https:\/\/[^\s]+$/, `${slug}: bad url ${r.url}`);
      assert.ok(types.has(r.type), `${slug}: bad type ${r.type}`);
    }
  }
});

test('resourcesFor puts the preferred learning format first and adds a search link', () => {
  const list = resourcesFor('html', 'HTML', 'practice');
  assert.equal(list[0].type, 'practice');
  const last = list[list.length - 1];
  assert.equal(last.curated, false);
  assert.match(last.url, /search_query=HTML%20tutorial/);
});

test('rateProject calculates difficulty and hours in code', () => {
  assert.deepEqual(rateProject([{ currentLevel: null, gap: 3 }]), { difficulty: 'starter', estimatedHours: 12 });
  assert.equal(rateProject([{ currentLevel: 3, gap: 1 }]).difficulty, 'intermediate');
  assert.equal(rateProject([{ currentLevel: 4, gap: 1 }]).difficulty, 'advanced');
  assert.equal(rateProject([{ currentLevel: 0, gap: 99 }]).estimatedHours, 60);
  assert.equal(rateProject([{ currentLevel: 4, gap: 0 }]).estimatedHours, 6);
});

test('validateProjects drops unknown skill IDs and projects without usable content', () => {
  const input = { gaps: [{ skillId: 1 }, { skillId: 2 }] };
  const out = ai.validateProjects(
    {
      projects: [
        { title: 'Good', description: 'Desc', deliverables: ['a', 'b'], skillIds: [1, 99, 1] },
        { title: 'Unknown only', description: 'Desc', deliverables: ['a', 'b'], skillIds: [99] },
        { title: 'Thin', description: 'Desc', deliverables: ['a'], skillIds: [2] },
      ],
    },
    input
  );
  assert.equal(out.projects.length, 1);
  assert.deepEqual(out.projects[0].skillIds, [1]);
  assert.throws(() => ai.validateProjects({ projects: [] }, input));
});

test('fallbackProjects makes one project per top gap using category templates', () => {
  const out = ai.fallbackProjects({
    count: 2,
    gaps: [
      { skillId: 1, name: 'SQL', category: 'Databases' },
      { skillId: 2, name: 'React', category: 'Web Frontend' },
      { skillId: 3, name: 'Docker', category: 'Tools and DevOps' },
    ],
  });
  assert.equal(out.aiGenerated, false);
  assert.equal(out.projects.length, 2);
  assert.deepEqual(out.projects[0].skillIds, [1]);
  assert.ok(out.projects[0].deliverables.length >= 3);
});
