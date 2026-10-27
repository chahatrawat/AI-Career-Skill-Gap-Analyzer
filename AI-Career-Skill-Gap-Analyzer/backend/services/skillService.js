'use strict';

const dbModule = require('../config/db');
const { httpError } = require('../middleware/errorMiddleware');

// config/db.js exports the mysql2/promise pool (directly or as { pool }).
const pool = typeof dbModule.query === 'function' ? dbModule : dbModule.pool;

const toIso = (value) => (value instanceof Date ? value.toISOString() : value);

/** All skills, grouped by category for the UI. */
async function listSkills() {
  const [rows] = await pool.query(
    `SELECT id, name, slug, category, description
       FROM skills
      ORDER BY category IS NULL, category, name`
  );
  return rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    category: row.category,
    description: row.description,
  }));
}

/** The logged-in user's saved ratings: { skills: [{ skillId, name, level, updatedAt }] }. */
async function getUserRatings(userId) {
  const [rows] = await pool.query(
    `SELECT us.skill_id, s.name, us.current_level, us.updated_at
       FROM user_skills us
       JOIN skills s ON s.id = us.skill_id
      WHERE us.user_id = ?
      ORDER BY s.name`,
    [userId]
  );
  return {
    skills: rows.map((row) => ({
      skillId: Number(row.skill_id),
      name: row.name,
      level: Number(row.current_level),
      updatedAt: toIso(row.updated_at),
    })),
  };
}

/**
 * Saves ratings in one transaction.
 * entries: [{ skillId, level }]  (level 1 to 5 saves, level null clears)
 * If the same skill appears twice, the last entry wins.
 */
async function saveUserRatings(userId, entries) {
  const byId = new Map();
  for (const entry of entries) {
    byId.set(Number(entry.skillId), entry.level === null ? null : Number(entry.level));
  }
  const ids = [...byId.keys()];

  const [found] = await pool.query('SELECT id FROM skills WHERE id IN (?)', [ids]);
  if (found.length !== ids.length) {
    const known = new Set(found.map((row) => Number(row.id)));
    const unknown = ids.filter((id) => !known.has(id));
    throw httpError(400, `Unknown skill ID: ${unknown.join(', ')}`);
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const [skillId, level] of byId) {
      if (level === null) {
        await connection.query(
          'DELETE FROM user_skills WHERE user_id = ? AND skill_id = ?',
          [userId, skillId]
        );
      } else {
        await connection.query(
          `INSERT INTO user_skills (user_id, skill_id, current_level)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE current_level = VALUES(current_level)`,
          [userId, skillId, level]
        );
      }
    }
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

  return getUserRatings(userId);
}

module.exports = { listSkills, getUserRatings, saveUserRatings };
