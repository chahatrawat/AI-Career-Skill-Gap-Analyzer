'use strict';

const dbModule = require('../config/db');
const { httpError } = require('../middleware/errorMiddleware');
const scoring = require('../utils/scoring');
const { explainSkillGap } = require('./aiService');
const { getCareerWithSkills } = require('./careerService');
const { listRoadmaps } = require('./roadmapService');
const quizService = require('./quizService');
const projectService = require('./projectService');
const plannerService = require('./plannerService');

// config/db.js exports the mysql2/promise pool (directly or as { pool }).
const pool = typeof dbModule.query === 'function' ? dbModule : dbModule.pool;

const TOP_GAPS = 5;
const HISTORY_LIMIT = 50;
const TREND_POINTS = 10;
const DASHBOARD_ROADMAPS = 10;

const toIso = (value) => (value instanceof Date ? value.toISOString() : value);
const parseJson = (value) => (typeof value === 'string' ? JSON.parse(value) : value);

/** Shape returned by POST /skill-gap and GET /:id (result_json plus the row fields). */
function formatAssessment(row) {
  const result = parseJson(row.result_json) || {};
  return {
    assessmentId: Number(row.id),
    career: { id: Number(row.career_id), name: row.career_name },
    readinessScore: Number(row.readiness_score),
    counts: result.counts,
    skills: result.skills,
    ai: result.ai,
    createdAt: toIso(row.created_at),
  };
}

/** Runs a skill-gap analysis for a career, saves it and returns it. */
async function runSkillGap(userId, careerId) {
  const career = await getCareerWithSkills(careerId);
  if (!career) throw httpError(404, 'Career not found');

  const requirements = (career.skills || []).map((s) => ({
    skillId: Number(s.skillId),
    name: s.name,
    category: s.category === undefined ? null : s.category,
    requiredLevel: Number(s.requiredLevel),
    importance: Number(s.importance),
  }));
  if (requirements.length === 0) {
    throw httpError(400, 'This career has no required skills to analyse');
  }

  const [ratingRows] = await pool.query(
    'SELECT skill_id, current_level FROM user_skills WHERE user_id = ? AND skill_id IN (?)',
    [userId, requirements.map((r) => r.skillId)]
  );
  if (ratingRows.length === 0) {
    throw httpError(400, 'Rate at least one skill for this career before running the analysis');
  }
  const ratings = new Map(ratingRows.map((r) => [Number(r.skill_id), Number(r.current_level)]));

  // Numbers and statuses come from scoring.js only.
  const analysis = scoring.analyze(requirements, ratings);
  const skills = scoring.sortByPriority(analysis.skills);

  // The AI only explains the result; on failure aiService returns its fallback.
  const ai = await explainSkillGap({
    careerName: career.name,
    readinessScore: analysis.readinessScore,
    skills,
  });

  const resultJson = { counts: analysis.counts, skills, ai };
  const [inserted] = await pool.query(
    `INSERT INTO skill_assessments (user_id, career_id, readiness_score, result_json)
     VALUES (?, ?, ?, ?)`,
    [userId, careerId, analysis.readinessScore, JSON.stringify(resultJson)]
  );

  return getAssessment(userId, inserted.insertId);
}

/** One saved analysis. 404 if it does not exist or belongs to someone else. */
async function getAssessment(userId, assessmentId) {
  const [rows] = await pool.query(
    `SELECT a.id, a.career_id, c.name AS career_name, a.readiness_score, a.result_json, a.created_at
       FROM skill_assessments a
       JOIN careers c ON c.id = a.career_id
      WHERE a.id = ? AND a.user_id = ?`,
    [assessmentId, userId]
  );
  if (rows.length === 0) throw httpError(404, 'Analysis not found');
  return formatAssessment(rows[0]);
}

/** The user's analyses, newest first (summary rows only). */
async function listHistory(userId) {
  const [rows] = await pool.query(
    `SELECT a.id, a.career_id, c.name AS career_name, a.readiness_score, a.created_at,
            JSON_EXTRACT(a.result_json, '$.counts') AS counts
       FROM skill_assessments a
       JOIN careers c ON c.id = a.career_id
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT ?`,
    [userId, HISTORY_LIMIT]
  );
  return rows.map((row) => ({
    assessmentId: Number(row.id),
    career: { id: Number(row.career_id), name: row.career_name },
    readinessScore: Number(row.readiness_score),
    counts: parseJson(row.counts),
    createdAt: toIso(row.created_at),
  }));
}

/** Per-skill rows for the comparison chart: current vs required, plus the quiz estimate when there is one. */
function buildSkillComparison(skills, evidence) {
  return skills.map((s) => {
    const e = evidence.get(s.skillId);
    return {
      skillId: s.skillId,
      name: s.name,
      category: s.category === undefined ? null : s.category,
      currentLevel: s.currentLevel === undefined ? null : s.currentLevel,
      requiredLevel: s.requiredLevel,
      importance: s.importance,
      status: s.status,
      quizLevel: e ? e.estimatedLevel : null,
    };
  });
}

/** Readiness per skill category, using the same formula as the overall score. */
function buildCategoryReadiness(skills) {
  const groups = new Map();
  for (const s of skills) {
    const key = s.category || 'Other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }
  return [...groups.entries()]
    .map(([category, list]) => ({
      category,
      skillCount: list.length,
      readinessScore: scoring.calculateReadiness(list),
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

/** Everything the dashboard page needs in one call. */
async function getDashboard(userId, today) {
  const [userRows] = await pool.query(
    `SELECT u.name, p.target_career_id, c.name AS target_career_name
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       LEFT JOIN careers c ON c.id = p.target_career_id
      WHERE u.id = ?`,
    [userId]
  );
  if (userRows.length === 0) throw httpError(404, 'User not found');
  const userRow = userRows[0];

  const [latestRows] = await pool.query(
    `SELECT a.id, a.career_id, c.name AS career_name, a.readiness_score, a.result_json, a.created_at
       FROM skill_assessments a
       JOIN careers c ON c.id = a.career_id
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT 1`,
    [userId]
  );

  let latestAssessment = null;
  let readinessHistory = [];
  let skillComparison = [];
  let categoryReadiness = [];
  const evidenceList = await quizService.getEvidence(userId);
  if (latestRows.length > 0) {
    const latest = latestRows[0];
    const result = parseJson(latest.result_json) || {};
    latestAssessment = {
      id: Number(latest.id),
      career: { id: Number(latest.career_id), name: latest.career_name },
      readinessScore: Number(latest.readiness_score),
      createdAt: toIso(latest.created_at),
      counts: result.counts,
      topGaps: scoring
        .getGaps(result.skills || [])
        .slice(0, TOP_GAPS)
        .map((s) => ({ skillId: s.skillId, name: s.name, gap: s.gap })),
    };

    const evidence = new Map(evidenceList.map((e) => [e.skillId, e]));
    skillComparison = buildSkillComparison(result.skills || [], evidence);
    categoryReadiness = buildCategoryReadiness(result.skills || []);

    // Trend for the same career as the latest analysis, oldest first.
    const [historyRows] = await pool.query(
      `SELECT id, readiness_score, created_at
         FROM skill_assessments
        WHERE user_id = ? AND career_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT ?`,
      [userId, latest.career_id, TREND_POINTS]
    );
    readinessHistory = historyRows.reverse().map((row) => ({
      assessmentId: Number(row.id),
      readinessScore: Number(row.readiness_score),
      createdAt: toIso(row.created_at),
    }));
  }

  const roadmaps = (await listRoadmaps(userId)).slice(0, DASHBOARD_ROADMAPS);
  const [projects, weeklyProgress] = await Promise.all([
    projectService.getSummary(userId),
    plannerService.getWeekSummary(userId, today),
  ]);

  return {
    user: {
      name: userRow.name,
      targetCareer:
        userRow.target_career_id === null || userRow.target_career_id === undefined
          ? null
          : { id: Number(userRow.target_career_id), name: userRow.target_career_name },
    },
    latestAssessment,
    readinessHistory,
    skillComparison,
    categoryReadiness,
    roadmaps,
    projects,
    weeklyProgress,
    quizzes: { skillsTested: evidenceList.length },
  };
}

module.exports = { runSkillGap, getAssessment, listHistory, getDashboard, buildCategoryReadiness, buildSkillComparison };
