'use strict';

/**
 * Weekly planner helpers. Pure functions only: dates are 'YYYY-MM-DD' strings and
 * all arithmetic is done in UTC, so server time zone never shifts a day.
 * Weeks start on Monday.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_SESSIONS_PER_DAY = 3;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

function isYmd(value) {
  if (typeof value !== 'string' || !YMD.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function toYmd(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(ymd, days) {
  return toYmd(new Date(new Date(`${ymd}T00:00:00Z`).getTime() + days * DAY_MS));
}

/** The Monday of the week that contains `ymd`. */
function weekStartOf(ymd) {
  const day = new Date(`${ymd}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(ymd, -((day + 6) % 7));
}

function todayYmd(now = new Date()) {
  return toYmd(now);
}

const percent = (part, whole) => (whole <= 0 ? 0 : Math.round((part / whole) * 100));

/**
 * sessions: [{ plannedMinutes, completedMinutes, status }]
 * Skipped sessions are left out of the plan; progress = completed / planned.
 * goalPercent compares completed minutes with the weekly study-hours goal.
 */
function summarizeWeek(sessions, targetMinutes) {
  let planned = 0;
  let completed = 0;
  let done = 0;
  let counted = 0;
  for (const s of sessions) {
    if (s.status === 'skipped') continue;
    counted += 1;
    planned += s.plannedMinutes;
    completed += s.status === 'done' ? s.completedMinutes : 0;
    if (s.status === 'done') done += 1;
  }
  return {
    plannedMinutes: planned,
    completedMinutes: completed,
    targetMinutes,
    sessionsTotal: counted,
    sessionsDone: done,
    completionPercent: percent(completed, planned),
    goalPercent: Math.min(100, percent(completed, targetMinutes)),
  };
}

/** Consecutive days (ending today, or yesterday if today has none yet) with a finished session. */
function calculateStreak(doneDates, today) {
  const set = new Set(doneDates);
  let cursor = set.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/**
 * Spreads the unplanned part of the weekly goal over the remaining days of the week.
 *   items:           [{ id, title }] in the order they should be studied
 *   targetMinutes:   weekly goal (weekly_study_hours x 60)
 *   alreadyPlanned:  minutes already on the plan this week
 *   fromDate:        first day that may receive a session (today, or the week start)
 * Returns [{ title, plannedDate, plannedMinutes, roadmapItemId }].
 */
function buildAutoPlan({ weekStart, targetMinutes, alreadyPlanned = 0, items, fromDate }) {
  const remaining = targetMinutes - alreadyPlanned;
  if (!items.length || remaining < 20) return [];

  const length = targetMinutes >= 480 ? 60 : 45;

  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const day = addDays(weekStart, i);
    if (day >= fromDate) days.push(day);
  }
  if (!days.length) return [];

  // At most three sessions a day, so a late-week plan stays realistic.
  const count = Math.min(days.length * MAX_SESSIONS_PER_DAY, Math.max(1, Math.round(remaining / length)));
  const perSession = length;
  const plan = [];
  for (let i = 0; i < count; i += 1) {
    const item = items[i % items.length];
    plan.push({
      title: item.title,
      plannedDate: days[Math.floor((i * days.length) / count)],
      plannedMinutes: perSession,
      roadmapItemId: item.id,
    });
  }
  return plan;
}

module.exports = { isYmd, addDays, weekStartOf, todayYmd, summarizeWeek, calculateStreak, buildAutoPlan, percent };
