'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getStatus,
  analyze,
  calculateReadiness,
  evaluateSkills,
  getGaps,
  sortByPriority,
} = require('./scoring');

const req = (skillId, name, requiredLevel, importance) => ({
  skillId,
  name,
  category: 'Test',
  requiredLevel,
  importance,
});

test('getStatus: missing, gap, met', () => {
  assert.equal(getStatus(null, 3), 'missing');
  assert.equal(getStatus(2, 3), 'gap');
  assert.equal(getStatus(3, 3), 'met');
  assert.equal(getStatus(5, 3), 'met');
});

test('all met gives 100 and no gaps', () => {
  const reqs = [req(1, 'A', 3, 2), req(2, 'B', 4, 3)];
  const result = analyze(reqs, { 1: 3, 2: 5 });
  assert.equal(result.readinessScore, 100);
  assert.deepEqual(result.counts, { met: 2, gap: 0, missing: 0 });
  assert.equal(getGaps(result.skills).length, 0);
});

test('all missing gives 0 and every skill is missing', () => {
  const reqs = [req(1, 'A', 3, 2), req(2, 'B', 4, 3)];
  const result = analyze(reqs, {});
  assert.equal(result.readinessScore, 0);
  assert.deepEqual(result.counts, { met: 0, gap: 0, missing: 2 });
  assert.equal(result.skills[0].currentLevel, null);
  assert.equal(result.skills[0].gap, 3);
  assert.equal(result.skills[0].priority, 6);
});

test('mixed case matches a hand calculation', () => {
  // A: req 4, imp 3, cur 2 -> achieved 2*3 = 6, required 12, gap 2, priority 6
  // B: req 3, imp 2, cur 5 -> achieved 3*2 = 6, required 6,  met
  // C: req 2, imp 1, no rating -> achieved 0, required 2, missing, priority 2
  // readiness = (6 + 6 + 0) / (12 + 6 + 2) * 100 = 12 / 20 * 100 = 60.0
  const reqs = [req(1, 'A', 4, 3), req(2, 'B', 3, 2), req(3, 'C', 2, 1)];
  const result = analyze(reqs, new Map([[1, 2], [2, 5]]));
  assert.equal(result.readinessScore, 60);
  assert.deepEqual(result.counts, { met: 1, gap: 1, missing: 1 });
  assert.equal(result.skills[0].status, 'gap');
  assert.equal(result.skills[0].priority, 6);
  assert.equal(result.skills[1].gap, 0);
  assert.equal(result.skills[2].priority, 2);
});

test('importance weights the score', () => {
  // Same levels, different importance on the failing skill.
  const lowImportance = [req(1, 'A', 4, 1), req(2, 'B', 4, 3)];
  const highImportance = [req(1, 'A', 4, 3), req(2, 'B', 4, 1)];
  const ratings = { 1: 0 + 1, 2: 4 }; // A rated 1, B rated 4
  const low = analyze(lowImportance, ratings).readinessScore;
  const high = analyze(highImportance, ratings).readinessScore;
  assert.ok(high < low, 'a gap on an important skill must cost more');
  // low:  (1*1 + 4*3) / (4*1 + 4*3) = 13/16 = 81.25 -> 81.3
  // high: (1*3 + 4*1) / (4*3 + 4*1) = 7/16 = 43.75 -> 43.8
  assert.equal(low, 81.3);
  assert.equal(high, 43.8);
});

test('score is rounded to one decimal place', () => {
  const reqs = [req(1, 'A', 3, 1)];
  assert.equal(analyze(reqs, { 1: 1 }).readinessScore, 33.3);
});

test('empty requirements give 0 without dividing by zero', () => {
  assert.equal(calculateReadiness([]), 0);
});

test('null rating behaves like no rating', () => {
  const skills = evaluateSkills([req(1, 'A', 3, 2)], { 1: null });
  assert.equal(skills[0].status, 'missing');
  assert.equal(skills[0].currentLevel, null);
});

test('getGaps returns gap and missing skills, highest priority first', () => {
  const reqs = [
    req(1, 'Low', 2, 1), // missing, priority 2
    req(2, 'High', 5, 3), // rating 2 -> gap 3, priority 9
    req(3, 'Done', 2, 2), // met
    req(4, 'Mid', 4, 2), // rating 3 -> gap 1, priority 2 (ties with Low)
  ];
  const result = analyze(reqs, { 2: 2, 3: 4, 4: 3 });
  const gaps = getGaps(result.skills);
  assert.deepEqual(gaps.map((s) => s.name), ['High', 'Mid', 'Low']);
});

test('sortByPriority does not mutate its input', () => {
  const skills = evaluateSkills([req(1, 'A', 3, 1), req(2, 'B', 5, 3)], {});
  const before = skills.map((s) => s.skillId);
  sortByPriority(skills);
  assert.deepEqual(skills.map((s) => s.skillId), before);
});
