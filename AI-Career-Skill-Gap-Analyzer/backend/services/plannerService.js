'use strict';

const dbModule = require('../config/db');
const { httpError } = require('../middleware/errorMiddleware');
const { getProfile } = require('./authService');
const planner = require('../utils/planner');

const pool = typeof dbModule.query === 'function' ? dbModule : dbModule.pool;

const HISTORY_WEEKS = 8;
const DEFAULT_WEEKLY_HOURS = 5;
const SESSION_COLUMNS = `id, roadmap_item_id, title, DATE_FORMAT(planned_date, '%Y-%m-%d') AS planned_date,
  planned_minutes, completed_minutes, status`;

function formatSession(row) {
  return {
    id: Number(row.id),
    roadmapItemId: row.roadmap_item_id === null ? null : Number(row.roadmap_item_id),
    title: row.title,
    plannedDate: row.planned_date,
    plannedMinutes: Number(row.planned_minutes),
    completedMinutes: Number(row.completed_minutes),
    status: row.status,
  };
}

async function targetMinutesFor(userId) {
  const profile = await getProfile(userId);
  const hours = profile ? Number(profile.weeklyStudyHours) : NaN;
  return (Number.isInteger(hours) && hours >= 1 ? hours : DEFAULT_WEEKLY_HOURS) * 60;
}

async function sessionsBetween(userId, from, to) {
  const [rows] = await pool.query(
    `SELECT ${SESSION_COLUMNS} FROM study_sessions
      WHERE user_id = ? AND planned_date BETWEEN ? AND ?
      ORDER BY planned_date, id`,
    [userId, from, to]
  );
  return rows.map(formatSession);
}

async function assertOwnItem(userId, itemId) {
  if (itemId === null || itemId === undefined) return;
  const [rows] = await pool.query(
    `SELECT i.id FROM roadmap_items i JOIN roadmaps r ON r.id = i.roadmap_id
      WHERE i.id = ? AND r.user_id = ?`,
    [itemId, userId]
  );
  if (rows.length === 0) throw httpError(404, 'Roadmap item not found');
}

async function streakFor(userId, today) {
  const [rows] = await pool.query(
    `SELECT DISTINCT DATE_FORMAT(planned_date, '%Y-%m-%d') AS d FROM study_sessions
      WHERE user_id = ? AND status = 'done' AND planned_date >= ?`,
    [userId, planner.addDays(today, -60)]
  );
  return planner.calculateStreak(rows.map((r) => r.d), today);
}

/** One week of the planner with progress numbers and recent-week history. */
async function getWeek(userId, requestedStart, todayOverride) {
  const today = todayOverride || planner.todayYmd();
  const weekStart = planner.weekStartOf(requestedStart || today);
  const weekEnd = planner.addDays(weekStart, 6);

  const [target, sessions, streak] = await Promise.all([
    targetMinutesFor(userId),
    sessionsBetween(userId, weekStart, weekEnd),
    streakFor(userId, today),
  ]);

  const historyFrom = planner.addDays(planner.weekStartOf(today), -7 * (HISTORY_WEEKS - 1));
  const [histRows] = await pool.query(
    `SELECT DATE_FORMAT(DATE_SUB(planned_date, INTERVAL WEEKDAY(planned_date) DAY), '%Y-%m-%d') AS week_start,
            SUM(CASE WHEN status <> 'skipped' THEN planned_minutes ELSE 0 END) AS planned,
            SUM(CASE WHEN status = 'done' THEN completed_minutes ELSE 0 END) AS completed
       FROM study_sessions
      WHERE user_id = ? AND planned_date >= ?
      GROUP BY week_start`,
    [userId, historyFrom]
  );
  const byWeek = new Map(histRows.map((r) => [r.week_start, r]));
  const history = [];
  for (let i = 0; i < HISTORY_WEEKS; i += 1) {
    const start = planner.addDays(historyFrom, i * 7);
    const row = byWeek.get(start);
    history.push({
      weekStart: start,
      plannedMinutes: row ? Number(row.planned) : 0,
      completedMinutes: row ? Number(row.completed) : 0,
    });
  }

  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const date = planner.addDays(weekStart, i);
    days.push({ date, sessions: sessions.filter((s) => s.plannedDate === date) });
  }

  return {
    weekStart,
    weekEnd,
    today,
    days,
    summary: planner.summarizeWeek(sessions, target),
    streakDays: streak,
    history,
  };
}

/** Small summary for the dashboard (current week only). */
async function getWeekSummary(userId, todayOverride) {
  const today = todayOverride || planner.todayYmd();
  const start = planner.weekStartOf(today);
  const [target, sessions, streak] = await Promise.all([
    targetMinutesFor(userId),
    sessionsBetween(userId, start, planner.addDays(start, 6)),
    streakFor(userId, today),
  ]);
  return { ...planner.summarizeWeek(sessions, target), streakDays: streak, weekStart: start };
}

async function createSession(userId, { title, plannedDate, plannedMinutes, roadmapItemId }) {
  await assertOwnItem(userId, roadmapItemId);
  const [res] = await pool.query(
    `INSERT INTO study_sessions (user_id, roadmap_item_id, title, planned_date, planned_minutes)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, roadmapItemId ?? null, title, plannedDate, plannedMinutes]
  );
  const [rows] = await pool.query(`SELECT ${SESSION_COLUMNS} FROM study_sessions WHERE id = ?`, [res.insertId]);
  return formatSession(rows[0]);
}

async function updateSession(userId, sessionId, changes) {
  const [found] = await pool.query(
    `SELECT ${SESSION_COLUMNS} FROM study_sessions WHERE id = ? AND user_id = ?`,
    [sessionId, userId]
  );
  if (found.length === 0) throw httpError(404, 'Study session not found');
  const current = formatSession(found[0]);

  const next = { ...current, ...Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined)) };
  // Marking a session done without saying how long counts the planned time.
  if (changes.status === 'done' && changes.completedMinutes === undefined) {
    next.completedMinutes = current.completedMinutes > 0 ? current.completedMinutes : next.plannedMinutes;
  }
  if (next.status !== 'done') next.completedMinutes = 0;

  await pool.query(
    `UPDATE study_sessions
        SET title = ?, planned_date = ?, planned_minutes = ?, completed_minutes = ?, status = ?
      WHERE id = ? AND user_id = ?`,
    [next.title, next.plannedDate, next.plannedMinutes, next.completedMinutes, next.status, sessionId, userId]
  );
  const [rows] = await pool.query(`SELECT ${SESSION_COLUMNS} FROM study_sessions WHERE id = ?`, [sessionId]);
  return formatSession(rows[0]);
}

async function deleteSession(userId, sessionId) {
  const [res] = await pool.query('DELETE FROM study_sessions WHERE id = ? AND user_id = ?', [sessionId, userId]);
  if (res.affectedRows === 0) throw httpError(404, 'Study session not found');
  return { id: sessionId, deleted: true };
}

/** Open roadmap items of the user's newest roadmap (for linking and auto-planning). */
async function listPlannableItems(userId) {
  const [rows] = await pool.query(
    `SELECT i.id, i.title, i.status, r.title AS roadmap_title
       FROM roadmap_items i
       JOIN roadmaps r ON r.id = i.roadmap_id
      WHERE r.id = (SELECT id FROM roadmaps WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 1)
        AND i.status <> 'completed'
      ORDER BY FIELD(i.status, 'in_progress', 'not_started'), i.item_order`,
    [userId]
  );
  return rows.map((r) => ({ id: Number(r.id), title: r.title, status: r.status, roadmapTitle: r.roadmap_title }));
}

/** Fills the unplanned part of the weekly goal with sessions for open roadmap items. */
async function autoPlan(userId, requestedStart, todayOverride) {
  const today = todayOverride || planner.todayYmd();
  const weekStart = planner.weekStartOf(requestedStart || today);
  if (weekStart < planner.weekStartOf(today)) throw httpError(400, 'You can only auto-plan the current or a future week');

  const items = await listPlannableItems(userId);
  if (items.length === 0) throw httpError(400, 'Create a roadmap first, then the planner can schedule its items');

  const target = await targetMinutesFor(userId);
  const existing = await sessionsBetween(userId, weekStart, planner.addDays(weekStart, 6));
  const already = existing.filter((s) => s.status !== 'skipped').reduce((sum, s) => sum + s.plannedMinutes, 0);

  const plan = planner.buildAutoPlan({
    weekStart,
    targetMinutes: target,
    alreadyPlanned: already,
    items,
    fromDate: weekStart > today ? weekStart : today,
  });
  if (plan.length === 0) throw httpError(400, 'This week already has enough planned time, or no days are left in it');

  await pool.query(
    `INSERT INTO study_sessions (user_id, roadmap_item_id, title, planned_date, planned_minutes) VALUES ?`,
    [plan.map((p) => [userId, p.roadmapItemId, p.title, p.plannedDate, p.plannedMinutes])]
  );
  return getWeek(userId, weekStart, today);
}

module.exports = { getWeek, getWeekSummary, createSession, updateSession, deleteSession, listPlannableItems, autoPlan };
