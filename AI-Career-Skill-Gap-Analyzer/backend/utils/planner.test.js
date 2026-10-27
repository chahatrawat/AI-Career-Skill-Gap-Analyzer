'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const p = require('./planner');

test('isYmd accepts real dates only', () => {
  assert.equal(p.isYmd('2026-10-25'), true);
  assert.equal(p.isYmd('2026-02-30'), false);
  assert.equal(p.isYmd('25-10-2026'), false);
  assert.equal(p.isYmd(undefined), false);
});

test('weekStartOf returns the Monday of the week', () => {
  assert.equal(p.weekStartOf('2026-10-26'), '2026-10-26'); // Monday
  assert.equal(p.weekStartOf('2026-10-25'), '2026-10-19'); // Sunday belongs to the week before
  assert.equal(p.weekStartOf('2026-10-21'), '2026-10-19');
});

test('addDays crosses month and year boundaries', () => {
  assert.equal(p.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(p.addDays('2026-03-01', -1), '2026-02-28');
});

test('summarizeWeek ignores skipped sessions and counts only finished minutes', () => {
  const s = p.summarizeWeek(
    [
      { plannedMinutes: 60, completedMinutes: 60, status: 'done' },
      { plannedMinutes: 60, completedMinutes: 0, status: 'planned' },
      { plannedMinutes: 60, completedMinutes: 0, status: 'skipped' },
    ],
    240
  );
  assert.equal(s.plannedMinutes, 120);
  assert.equal(s.completedMinutes, 60);
  assert.equal(s.completionPercent, 50);
  assert.equal(s.goalPercent, 25);
  assert.equal(s.sessionsDone, 1);
  assert.equal(s.sessionsTotal, 2);
});

test('summarizeWeek handles an empty week', () => {
  const s = p.summarizeWeek([], 300);
  assert.equal(s.completionPercent, 0);
  assert.equal(s.goalPercent, 0);
});

test('calculateStreak counts back from today, or from yesterday when today is empty', () => {
  assert.equal(p.calculateStreak(['2026-10-25', '2026-10-24', '2026-10-23', '2026-10-20'], '2026-10-25'), 3);
  assert.equal(p.calculateStreak(['2026-10-24', '2026-10-23'], '2026-10-25'), 2);
  assert.equal(p.calculateStreak(['2026-10-22'], '2026-10-25'), 0);
});

test('buildAutoPlan spreads the weekly goal over the remaining days', () => {
  const plan = p.buildAutoPlan({
    weekStart: '2026-10-19',
    targetMinutes: 360,
    items: [{ id: 1, title: 'A' }, { id: 2, title: 'B' }],
    fromDate: '2026-10-19',
  });
  assert.equal(plan.length, 8);
  assert.ok(plan.every((s) => s.plannedMinutes === 45));
  assert.equal(plan[0].plannedDate, '2026-10-19');
  assert.deepEqual(new Set(plan.map((s) => s.roadmapItemId)), new Set([1, 2]));
});

test('buildAutoPlan never schedules before fromDate and caps sessions per day', () => {
  const plan = p.buildAutoPlan({
    weekStart: '2026-10-19',
    targetMinutes: 600,
    items: [{ id: 1, title: 'A' }],
    fromDate: '2026-10-25', // only Sunday is left
  });
  assert.ok(plan.length <= 3);
  assert.ok(plan.every((s) => s.plannedDate === '2026-10-25'));
});

test('buildAutoPlan returns nothing when the goal is already planned or there are no items', () => {
  assert.deepEqual(p.buildAutoPlan({ weekStart: '2026-10-19', targetMinutes: 300, alreadyPlanned: 300, items: [{ id: 1, title: 'A' }], fromDate: '2026-10-19' }), []);
  assert.deepEqual(p.buildAutoPlan({ weekStart: '2026-10-19', targetMinutes: 300, items: [], fromDate: '2026-10-19' }), []);
});
