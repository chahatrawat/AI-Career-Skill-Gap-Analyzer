'use strict';

const dbModule = require('../config/db');
const { httpError } = require('../middleware/errorMiddleware');
const { getProfile } = require('./authService');
const { generateRoadmap } = require('./aiService');
const { getGaps } = require('../utils/scoring');
const { resourcesFor } = require('./resourceService');

// config/db.js exports the mysql2/promise pool (directly or as { pool }).
const pool = typeof dbModule.query === 'function' ? dbModule : dbModule.pool;

const DEFAULT_WEEKLY_HOURS = 5;
const HOURS_PER_LEVEL = 5; // durationWeeks = (gap x 5) / weeklyHours

const toIso = (value) => (value instanceof Date ? value.toISOString() : value);
const parseJson = (value) => (typeof value === 'string' ? JSON.parse(value) : value);
const progressPercent = (completed, total) =>
  total === 0 ? 0 : Math.round((completed / total) * 100);

/** Nearest 0.5 week, minimum 0.5, maximum 8. */
function roundWeeks(weeks) {
  return Math.min(8, Math.max(0.5, Math.round(weeks * 2) / 2));
}

async function resolveWeeklyHours(userId, requested) {
  if (requested) return requested;
  const profile = await getProfile(userId);
  const hours = profile ? Number(profile.weeklyStudyHours) : NaN;
  return Number.isInteger(hours) && hours >= 1 && hours <= 60 ? hours : DEFAULT_WEEKLY_HOURS;
}

/** The user's own analysis, or a 404 (another user's analysis looks the same as a missing one). */
async function loadOwnedAssessment(userId, assessmentId) {
  const [rows] = await pool.query(
    `SELECT a.id, a.career_id, c.name AS career_name, a.result_json
       FROM skill_assessments a
       JOIN careers c ON c.id = a.career_id
      WHERE a.id = ? AND a.user_id = ?`,
    [assessmentId, userId]
  );
  if (rows.length === 0) throw httpError(404, 'Analysis not found');
  return rows[0];
}

/**
 * Generates a roadmap from a saved analysis and saves it.
 * The AI supplies titles and grouping; durations are calculated here.
 */
async function createRoadmap(userId, { assessmentId, weeklyHours }) {
  const assessment = await loadOwnedAssessment(userId, assessmentId);
  const result = parseJson(assessment.result_json) || {};
  const gaps = getGaps(result.skills || []);
  if (gaps.length === 0) {
    throw httpError(400, 'This analysis has no skill gaps, so there is nothing to plan');
  }

  const hours = await resolveWeeklyHours(userId, weeklyHours);

  // Slow call: made before any database transaction is opened.
  const plan = await generateRoadmap({
    careerName: assessment.career_name,
    weeklyHours: hours,
    gaps,
  });

  // Flatten phases into items and calculate durations.
  const gapBySkill = new Map(gaps.map((g) => [g.skillId, g.gap]));
  const itemsPerSkill = new Map();
  plan.phases.forEach((phase) =>
    phase.items.forEach((item) =>
      itemsPerSkill.set(item.skillId, (itemsPerSkill.get(item.skillId) || 0) + 1)
    )
  );

  const flat = [];
  plan.phases.forEach((phase, phaseIndex) => {
    phase.items.forEach((item) => {
      const perSkillWeeks = (gapBySkill.get(item.skillId) * HOURS_PER_LEVEL) / hours;
      // A skill the AI spread over several items shares its time between them.
      const weeks = roundWeeks(perSkillWeeks / itemsPerSkill.get(item.skillId));
      flat.push({ phaseNumber: phaseIndex + 1, phaseTitle: phase.title, item, weeks });
    });
  });
  const totalWeeks = Math.ceil(flat.reduce((sum, row) => sum + row.weeks, 0));

  const connection = await pool.getConnection();
  let roadmapId;
  try {
    await connection.beginTransaction();
    const [inserted] = await connection.query(
      `INSERT INTO roadmaps
         (user_id, career_id, assessment_id, title, summary, weekly_hours, total_weeks, ai_generated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        assessment.career_id,
        assessment.id,
        plan.title,
        plan.summary || null,
        hours,
        totalWeeks,
        plan.aiGenerated ? 1 : 0,
      ]
    );
    roadmapId = inserted.insertId;

    const rows = flat.map((row, index) => [
      roadmapId,
      row.phaseNumber,
      row.phaseTitle,
      index + 1,
      row.item.skillId,
      row.item.title,
      row.item.description || null,
      row.weeks,
    ]);
    await connection.query(
      `INSERT INTO roadmap_items
         (roadmap_id, phase_number, phase_title, item_order, skill_id, title, description, duration_weeks)
       VALUES ?`,
      [rows]
    );
    await connection.commit();
  } catch (err) {
    try {
      await connection.rollback();
    } catch (_) {
      // the original error is the one worth reporting
    }
    throw err;
  } finally {
    connection.release();
  }

  return getRoadmap(userId, roadmapId);
}

/** The user's roadmaps, newest first, with progress. */
async function listRoadmaps(userId) {
  const [rows] = await pool.query(
    `SELECT r.id, r.title, r.weekly_hours, r.total_weeks, r.ai_generated, r.created_at,
            c.name AS career_name,
            COUNT(i.id) AS total_items,
            COALESCE(SUM(i.status = 'completed'), 0) AS completed_items
       FROM roadmaps r
       JOIN careers c ON c.id = r.career_id
       LEFT JOIN roadmap_items i ON i.roadmap_id = r.id
      WHERE r.user_id = ?
      GROUP BY r.id, r.title, r.weekly_hours, r.total_weeks, r.ai_generated, r.created_at, c.name
      ORDER BY r.created_at DESC, r.id DESC`,
    [userId]
  );
  return rows.map((row) => {
    const total = Number(row.total_items);
    const completed = Number(row.completed_items);
    return {
      id: Number(row.id),
      title: row.title,
      careerName: row.career_name,
      weeklyHours: Number(row.weekly_hours),
      totalWeeks: Number(row.total_weeks),
      aiGenerated: Boolean(row.ai_generated),
      progressPercent: progressPercent(completed, total),
      completedItems: completed,
      totalItems: total,
      createdAt: toIso(row.created_at),
    };
  });
}

/** One roadmap with its items grouped by phase. 404 if it is not the user's. */
async function getRoadmap(userId, roadmapId) {
  const [rows] = await pool.query(
    `SELECT r.id, r.title, r.summary, r.weekly_hours, r.total_weeks, r.ai_generated,
            r.created_at, c.name AS career_name
       FROM roadmaps r
       JOIN careers c ON c.id = r.career_id
      WHERE r.id = ? AND r.user_id = ?`,
    [roadmapId, userId]
  );
  if (rows.length === 0) throw httpError(404, 'Roadmap not found');
  const roadmap = rows[0];

  const [itemRows] = await pool.query(
    `SELECT i.id, i.phase_number, i.phase_title, i.skill_id, i.title, i.description, i.duration_weeks, i.status,
            s.name AS skill_name, s.slug AS skill_slug
       FROM roadmap_items i
       LEFT JOIN skills s ON s.id = i.skill_id
      WHERE i.roadmap_id = ?
      ORDER BY i.item_order`,
    [roadmapId]
  );

  const profile = await getProfile(userId);
  const learningFormat = profile && profile.learningFormat ? profile.learningFormat : 'mixed';

  const phases = [];
  let completed = 0;
  for (const row of itemRows) {
    let phase = phases[phases.length - 1];
    if (!phase || phase.phaseNumber !== Number(row.phase_number)) {
      phase = { phaseNumber: Number(row.phase_number), title: row.phase_title, items: [] };
      phases.push(phase);
    }
    if (row.status === 'completed') completed += 1;
    phase.items.push({
      id: Number(row.id),
      skillId: row.skill_id === null ? null : Number(row.skill_id),
      title: row.title,
      description: row.description,
      durationWeeks: Number(row.duration_weeks),
      status: row.status,
      skillName: row.skill_name || null,
      resources: row.skill_slug ? resourcesFor(row.skill_slug, row.skill_name, learningFormat) : [],
    });
  }

  return {
    id: Number(roadmap.id),
    title: roadmap.title,
    summary: roadmap.summary,
    careerName: roadmap.career_name,
    weeklyHours: Number(roadmap.weekly_hours),
    totalWeeks: Number(roadmap.total_weeks),
    aiGenerated: Boolean(roadmap.ai_generated),
    progressPercent: progressPercent(completed, itemRows.length),
    completedItems: completed,
    totalItems: itemRows.length,
    createdAt: toIso(roadmap.created_at),
    phases,
  };
}

/** Sets an item's status and returns the updated roadmap (so progress refreshes). */
async function updateItemStatus(userId, roadmapId, itemId, status) {
  const [owned] = await pool.query(
    `SELECT i.id
       FROM roadmap_items i
       JOIN roadmaps r ON r.id = i.roadmap_id
      WHERE i.id = ? AND i.roadmap_id = ? AND r.user_id = ?`,
    [itemId, roadmapId, userId]
  );
  if (owned.length === 0) throw httpError(404, 'Roadmap item not found');

  await pool.query(
    `UPDATE roadmap_items
        SET status = ?,
            completed_at = CASE WHEN ? = 'completed' THEN COALESCE(completed_at, NOW()) ELSE NULL END
      WHERE id = ?`,
    [status, status, itemId]
  );
  await pool.query('UPDATE roadmaps SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [roadmapId]);

  return getRoadmap(userId, roadmapId);
}

/** Deletes a roadmap; its items go with it (ON DELETE CASCADE). */
async function deleteRoadmap(userId, roadmapId) {
  const [result] = await pool.query('DELETE FROM roadmaps WHERE id = ? AND user_id = ?', [
    roadmapId,
    userId,
  ]);
  if (result.affectedRows === 0) throw httpError(404, 'Roadmap not found');
  return { id: roadmapId, deleted: true };
}

module.exports = {
  createRoadmap,
  listRoadmaps,
  getRoadmap,
  updateItemStatus,
  deleteRoadmap,
  roundWeeks,
};
