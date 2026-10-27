'use strict';

const dbModule = require('../config/db');
const { httpError } = require('../middleware/errorMiddleware');
const { BANK } = require('../data/quizBank');
const { estimateLevel, evidenceStatus, shuffle } = require('../utils/quiz');
const { getCareerWithSkills } = require('./careerService');
const { getProfile } = require('./authService');

const pool = typeof dbModule.query === 'function' ? dbModule : dbModule.pool;

const toIso = (value) => (value instanceof Date ? value.toISOString() : value);

async function loadSkill(skillId) {
  const [rows] = await pool.query('SELECT id, name, slug FROM skills WHERE id = ?', [skillId]);
  if (rows.length === 0) throw httpError(404, 'Skill not found');
  return { id: Number(rows[0].id), name: rows[0].name, slug: rows[0].slug };
}

async function selfLevel(userId, skillId) {
  const [rows] = await pool.query(
    'SELECT current_level FROM user_skills WHERE user_id = ? AND skill_id = ?',
    [userId, skillId]
  );
  return rows.length ? Number(rows[0].current_level) : null;
}

/** Latest attempt per skill for a user: Map<skillId, attempt>. */
async function latestAttempts(userId) {
  const [rows] = await pool.query(
    `SELECT qa.skill_id, qa.correct_count, qa.total_questions, qa.estimated_level, qa.created_at
       FROM quiz_attempts qa
       JOIN (SELECT skill_id, MAX(id) AS last_id
               FROM quiz_attempts WHERE user_id = ? GROUP BY skill_id) m
         ON m.last_id = qa.id`,
    [userId]
  );
  return new Map(
    rows.map((r) => [
      Number(r.skill_id),
      {
        correct: Number(r.correct_count),
        total: Number(r.total_questions),
        estimatedLevel: Number(r.estimated_level),
        takenAt: toIso(r.created_at),
      },
    ])
  );
}

/** Skills of the user's target career with their latest quiz evidence. */
async function listQuizSkills(userId) {
  const profile = await getProfile(userId);
  if (!profile || !profile.targetCareerId) return { career: null, skills: [] };
  const career = await getCareerWithSkills(profile.targetCareerId);
  if (!career) return { career: null, skills: [] };

  const [ratingRows] = await pool.query(
    'SELECT skill_id, current_level FROM user_skills WHERE user_id = ?',
    [userId]
  );
  const ratings = new Map(ratingRows.map((r) => [Number(r.skill_id), Number(r.current_level)]));
  const attempts = await latestAttempts(userId);

  const [slugRows] = await pool.query('SELECT id, slug FROM skills WHERE id IN (?)', [
    career.skills.map((s) => s.skillId),
  ]);
  const slugById = new Map(slugRows.map((r) => [Number(r.id), r.slug]));

  return {
    career: { id: career.id, name: career.name },
    skills: career.skills.map((s) => {
      const bank = BANK[slugById.get(s.skillId)];
      const attempt = attempts.get(s.skillId) || null;
      const self = ratings.has(s.skillId) ? ratings.get(s.skillId) : null;
      return {
        skillId: s.skillId,
        name: s.name,
        category: s.category,
        requiredLevel: s.requiredLevel,
        selfLevel: self,
        questionCount: bank ? bank.length : 0,
        latestAttempt: attempt,
        evidence: attempt ? evidenceStatus(self, attempt.estimatedLevel) : null,
      };
    }),
  };
}

/** Questions for one skill. Answers never leave the server; option order is shuffled. */
async function getQuiz(skillId) {
  const skill = await loadSkill(skillId);
  const bank = BANK[skill.slug];
  if (!bank || bank.length === 0) throw httpError(404, 'There is no quiz for this skill yet');
  return {
    skill: { id: skill.id, name: skill.name },
    questions: bank.map(([prompt, options], index) => ({
      id: index,
      prompt,
      options: shuffle(options.map((text, optionId) => ({ id: optionId, text }))),
    })),
  };
}

/**
 * answers: [{ questionId, optionId }] for every question.
 * Saves the attempt; with applyToRating the user's self rating is set to the estimate.
 */
async function submitQuiz(userId, skillId, answers, applyToRating = false) {
  const skill = await loadSkill(skillId);
  const bank = BANK[skill.slug];
  if (!bank || bank.length === 0) throw httpError(404, 'There is no quiz for this skill yet');

  const chosen = new Map();
  for (const a of answers) chosen.set(Number(a.questionId), Number(a.optionId));
  if (chosen.size !== bank.length || bank.some((_, i) => !chosen.has(i))) {
    throw httpError(400, `Answer all ${bank.length} questions`);
  }

  let correct = 0;
  const review = bank.map(([prompt, options, correctIndex], index) => {
    const picked = chosen.get(index);
    if (!Number.isInteger(picked) || picked < 0 || picked >= options.length) {
      throw httpError(400, 'An answer refers to an option that does not exist');
    }
    const isCorrect = picked === correctIndex;
    if (isCorrect) correct += 1;
    return { questionId: index, prompt, yourAnswer: options[picked], correctAnswer: options[correctIndex], correct: isCorrect };
  });

  const estimated = estimateLevel(correct, bank.length);
  await pool.query(
    `INSERT INTO quiz_attempts (user_id, skill_id, correct_count, total_questions, estimated_level)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, skill.id, correct, bank.length, estimated]
  );

  const previous = await selfLevel(userId, skill.id);
  let applied = false;
  if (applyToRating) {
    await pool.query(
      `INSERT INTO user_skills (user_id, skill_id, current_level) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE current_level = VALUES(current_level)`,
      [userId, skill.id, estimated]
    );
    applied = true;
  }
  const self = applied ? estimated : previous;

  return {
    skill: { id: skill.id, name: skill.name },
    correct,
    total: bank.length,
    estimatedLevel: estimated,
    selfLevel: self,
    evidence: evidenceStatus(self, estimated),
    ratingUpdated: applied,
    review,
  };
}

/** Evidence for every skill the user has been quizzed on (used by the analysis page and dashboard). */
async function getEvidence(userId) {
  const attempts = await latestAttempts(userId);
  if (attempts.size === 0) return [];
  const ids = [...attempts.keys()];
  const [ratingRows] = await pool.query(
    'SELECT skill_id, current_level FROM user_skills WHERE user_id = ? AND skill_id IN (?)',
    [userId, ids]
  );
  const ratings = new Map(ratingRows.map((r) => [Number(r.skill_id), Number(r.current_level)]));
  return ids.map((skillId) => {
    const a = attempts.get(skillId);
    const self = ratings.has(skillId) ? ratings.get(skillId) : null;
    return { skillId, ...a, selfLevel: self, evidence: evidenceStatus(self, a.estimatedLevel) };
  });
}

module.exports = { listQuizSkills, getQuiz, submitQuiz, getEvidence };
