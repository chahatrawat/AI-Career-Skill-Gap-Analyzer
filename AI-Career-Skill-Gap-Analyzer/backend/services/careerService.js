'use strict';

/**
 * Careers and the skills each career requires (read-only seed data).
 *
 * Contract used by other files:
 *   getCareerWithSkills(careerId) -> { id, name, slug, description,
 *     skills: [{ skillId, name, category, requiredLevel, importance }] }  or null if not found
 */

const { pool } = require('../config/db');

/** All careers, with how many skills each one requires. */
async function listCareers() {
  const [rows] = await pool.query(
    `SELECT c.id, c.name, c.slug, c.description, COUNT(cs.skill_id) AS skill_count
       FROM careers c
       LEFT JOIN career_skills cs ON cs.career_id = c.id
      GROUP BY c.id, c.name, c.slug, c.description
      ORDER BY c.name`
  );
  return rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    description: row.description,
    skillCount: Number(row.skill_count),
  }));
}

/** One career with its required skills (most important first), or null. */
async function getCareerWithSkills(careerId) {
  const [careerRows] = await pool.query(
    'SELECT id, name, slug, description FROM careers WHERE id = ?',
    [careerId]
  );
  if (careerRows.length === 0) return null;
  const career = careerRows[0];

  const [skillRows] = await pool.query(
    `SELECT s.id AS skill_id, s.name, s.category, cs.required_level, cs.importance
       FROM career_skills cs
       JOIN skills s ON s.id = cs.skill_id
      WHERE cs.career_id = ?
      ORDER BY cs.importance DESC, s.name`,
    [careerId]
  );

  return {
    id: Number(career.id),
    name: career.name,
    slug: career.slug,
    description: career.description,
    skills: skillRows.map((row) => ({
      skillId: Number(row.skill_id),
      name: row.name,
      category: row.category,
      requiredLevel: Number(row.required_level),
      importance: Number(row.importance),
    })),
  };
}

module.exports = { listCareers, getCareerWithSkills };
