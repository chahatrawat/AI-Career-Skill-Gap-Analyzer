'use strict';

/**
 * Skill-gap scoring. Pure functions only: no database, no AI, no I/O.
 * All numbers and statuses in the application come from this file.
 *
 * requirements: [{ skillId, name, category, requiredLevel, importance }]
 * ratings:      Map<skillId, level> or plain object { [skillId]: level }
 *               A skill with no rating (or null) is "missing" and counts as 0.
 */

const LEVEL_LABELS = {
  1: 'Beginner',
  2: 'Basic',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert',
};

function lookupRating(ratings, skillId) {
  if (!ratings) return null;
  const value = ratings instanceof Map ? ratings.get(skillId) : ratings[skillId];
  return value === undefined || value === null ? null : Number(value);
}

function getStatus(currentLevel, requiredLevel) {
  if (currentLevel === null) return 'missing';
  return currentLevel < requiredLevel ? 'gap' : 'met';
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

/**
 * Builds the per-skill result rows (shape from DATABASE.md, section 4).
 * Rows are returned in the same order as `requirements`.
 */
function evaluateSkills(requirements, ratings) {
  return requirements.map((req) => {
    const current = lookupRating(ratings, req.skillId);
    const effective = current === null ? 0 : current;
    const status = getStatus(current, req.requiredLevel);
    const gap = status === 'met' ? 0 : req.requiredLevel - effective;
    return {
      skillId: req.skillId,
      name: req.name,
      category: req.category === undefined ? null : req.category,
      currentLevel: current,
      requiredLevel: req.requiredLevel,
      importance: req.importance,
      status,
      gap,
      priority: gap * req.importance,
    };
  });
}

/**
 * readiness = sum(min(current, required) x importance)
 *           / sum(required x importance) x 100, rounded to 1 decimal.
 */
function calculateReadiness(skills) {
  let achievedTotal = 0;
  let requiredTotal = 0;
  for (const skill of skills) {
    const current = skill.currentLevel === null ? 0 : skill.currentLevel;
    achievedTotal += Math.min(current, skill.requiredLevel) * skill.importance;
    requiredTotal += skill.requiredLevel * skill.importance;
  }
  if (requiredTotal === 0) return 0;
  return round1((achievedTotal / requiredTotal) * 100);
}

function countStatuses(skills) {
  const counts = { met: 0, gap: 0, missing: 0 };
  for (const skill of skills) counts[skill.status] += 1;
  return counts;
}

/**
 * Highest priority first. Ties: higher importance, then name, so the order
 * is stable and repeatable.
 */
function sortByPriority(skills) {
  return [...skills].sort(
    (a, b) =>
      b.priority - a.priority ||
      b.importance - a.importance ||
      a.name.localeCompare(b.name)
  );
}

/** Only the skills that still need work (gap or missing), in priority order. */
function getGaps(skills) {
  return sortByPriority(skills.filter((s) => s.status !== 'met'));
}

/** Full analysis: { readinessScore, counts, skills }. */
function analyze(requirements, ratings) {
  const skills = evaluateSkills(requirements, ratings);
  return {
    readinessScore: calculateReadiness(skills),
    counts: countStatuses(skills),
    skills,
  };
}

module.exports = {
  LEVEL_LABELS,
  getStatus,
  evaluateSkills,
  calculateReadiness,
  countStatuses,
  sortByPriority,
  getGaps,
  analyze,
};
