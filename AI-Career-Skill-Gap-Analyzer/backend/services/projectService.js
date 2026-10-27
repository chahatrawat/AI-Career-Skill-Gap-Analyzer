'use strict';

const dbModule = require('../config/db');
const { httpError } = require('../middleware/errorMiddleware');
const { getGaps } = require('../utils/scoring');
const { generateProjects } = require('./aiService');

const pool = typeof dbModule.query === 'function' ? dbModule : dbModule.pool;

const SUGGESTION_COUNT = 3;
const MAX_GAP_SKILLS = 6;
const HOURS_PER_GAP_LEVEL = 4;

const toIso = (value) => (value instanceof Date ? value.toISOString() : value);
const parseJson = (value) => (typeof value === 'string' ? JSON.parse(value) : value);

/**
 * Difficulty and effort are calculated here, not by the AI.
 * skills: the project's skills as they appear in the analysis (currentLevel may be null).
 */
function rateProject(skills) {
  const levels = skills.map((s) => (s.currentLevel == null ? 0 : s.currentLevel));
  const avg = levels.reduce((a, b) => a + b, 0) / Math.max(1, levels.length);
  const difficulty = avg < 2 ? 'starter' : avg < 3.5 ? 'intermediate' : 'advanced';
  const gapTotal = skills.reduce((sum, s) => sum + (s.gap || 0), 0);
  const raw = Math.max(1, gapTotal) * HOURS_PER_GAP_LEVEL;
  const estimatedHours = Math.min(60, Math.max(6, Math.round(raw / 2) * 2));
  return { difficulty, estimatedHours };
}

async function skillNames(ids) {
  if (ids.length === 0) return new Map();
  const [rows] = await pool.query('SELECT id, name FROM skills WHERE id IN (?)', [ids]);
  return new Map(rows.map((r) => [Number(r.id), r.name]));
}

function formatRow(row, names) {
  const skillIds = parseJson(row.skill_ids) || [];
  return {
    id: Number(row.id),
    title: row.title,
    description: row.description,
    difficulty: row.difficulty,
    estimatedHours: Number(row.estimated_hours),
    deliverables: parseJson(row.deliverables) || [],
    skills: skillIds.map((id) => ({ id, name: names.get(id) || 'Skill' })),
    status: row.status,
    aiGenerated: Boolean(row.ai_generated),
    createdAt: toIso(row.created_at),
  };
}

async function listProjects(userId) {
  const [rows] = await pool.query(
    `SELECT id, title, description, difficulty, estimated_hours, deliverables, skill_ids,
            status, ai_generated, created_at
       FROM projects WHERE user_id = ?
      ORDER BY FIELD(status, 'in_progress', 'suggested', 'completed'), created_at DESC, id DESC`,
    [userId]
  );
  const all = new Set();
  rows.forEach((r) => (parseJson(r.skill_ids) || []).forEach((id) => all.add(Number(id))));
  const names = await skillNames([...all]);
  return rows.map((r) => formatRow(r, names));
}

/**
 * Suggests projects from the user's latest analysis and saves them.
 * Untouched older suggestions are replaced; projects the user started or finished are kept.
 */
async function suggestProjects(userId) {
  const [rows] = await pool.query(
    `SELECT a.career_id, c.name AS career_name, a.result_json
       FROM skill_assessments a JOIN careers c ON c.id = a.career_id
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC, a.id DESC LIMIT 1`,
    [userId]
  );
  if (rows.length === 0) throw httpError(400, 'Run a skill-gap analysis first so the lab knows what to practise');
  const latest = rows[0];
  const result = parseJson(latest.result_json) || {};
  const gaps = getGaps(result.skills || []).slice(0, MAX_GAP_SKILLS);
  if (gaps.length === 0) throw httpError(400, 'You meet every requirement, so there are no gaps to practise');

  const plan = await generateProjects({ careerName: latest.career_name, count: SUGGESTION_COUNT, gaps });
  if (plan.projects.length === 0) throw httpError(502, 'Could not create project ideas. Please try again.');

  const bySkill = new Map(gaps.map((g) => [g.skillId, g]));
  const values = plan.projects.map((p) => {
    const rated = rateProject(p.skillIds.map((id) => bySkill.get(id)));
    return [
      userId, latest.career_id, p.title, p.description, rated.difficulty, rated.estimatedHours,
      JSON.stringify(p.deliverables), JSON.stringify(p.skillIds), plan.aiGenerated ? 1 : 0,
    ];
  });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("DELETE FROM projects WHERE user_id = ? AND status = 'suggested'", [userId]);
    await connection.query(
      `INSERT INTO projects
         (user_id, career_id, title, description, difficulty, estimated_hours, deliverables, skill_ids, ai_generated)
       VALUES ?`,
      [values]
    );
    await connection.commit();
  } catch (err) {
    try { await connection.rollback(); } catch (_) { /* report the original error */ }
    throw err;
  } finally {
    connection.release();
  }
  return { aiGenerated: plan.aiGenerated, projects: await listProjects(userId) };
}

async function updateProjectStatus(userId, projectId, status) {
  const [result] = await pool.query('UPDATE projects SET status = ? WHERE id = ? AND user_id = ?', [status, projectId, userId]);
  if (result.affectedRows === 0) {
    const [exists] = await pool.query('SELECT id FROM projects WHERE id = ? AND user_id = ?', [projectId, userId]);
    if (exists.length === 0) throw httpError(404, 'Project not found');
  }
  return listProjects(userId);
}

async function deleteProject(userId, projectId) {
  const [result] = await pool.query('DELETE FROM projects WHERE id = ? AND user_id = ?', [projectId, userId]);
  if (result.affectedRows === 0) throw httpError(404, 'Project not found');
  return { id: projectId, deleted: true };
}

async function getSummary(userId) {
  const [rows] = await pool.query(
    'SELECT status, COUNT(*) AS n FROM projects WHERE user_id = ? GROUP BY status',
    [userId]
  );
  const summary = { total: 0, suggested: 0, inProgress: 0, completed: 0 };
  for (const r of rows) {
    const n = Number(r.n);
    summary.total += n;
    if (r.status === 'suggested') summary.suggested = n;
    if (r.status === 'in_progress') summary.inProgress = n;
    if (r.status === 'completed') summary.completed = n;
  }
  return summary;
}

module.exports = { suggestProjects, listProjects, updateProjectStatus, deleteProject, getSummary, rateProject };
