'use strict';

/**
 * Quiz scoring. Pure functions only: no database, no AI.
 *
 * A short quiz can only give limited evidence, so the estimated level tops out
 * at 4 (Advanced). Level 5 (Expert) cannot be proven by 3 questions.
 */

const MAX_ESTIMATED_LEVEL = 4;

/** correct / total -> estimated level 1 to 4. */
function estimateLevel(correct, total) {
  if (!Number.isInteger(correct) || !Number.isInteger(total) || total <= 0 || correct < 0 || correct > total) {
    throw new RangeError('correct must be between 0 and total, and total must be above 0');
  }
  const ratio = correct / total;
  if (ratio === 1) return MAX_ESTIMATED_LEVEL;
  if (ratio >= 0.66) return 3;
  if (ratio >= 0.33) return 2;
  return 1;
}

/**
 * Compares the user's own rating with the quiz estimate.
 *   unrated    no self rating to compare with
 *   supported  quiz level is at or above the self rating (or self 5 and quiz 4, the quiz maximum)
 *   close      quiz level is one below the self rating
 *   overrated  quiz level is two or more below the self rating
 */
function evidenceStatus(selfLevel, estimatedLevel) {
  if (selfLevel === null || selfLevel === undefined) return 'unrated';
  const self = Number(selfLevel);
  const est = Number(estimatedLevel);
  if (est >= Math.min(self, MAX_ESTIMATED_LEVEL)) return 'supported';
  return self - est === 1 ? 'close' : 'overrated';
}

/** Fisher-Yates shuffle that returns a new array. `random` is injectable for tests. */
function shuffle(list, random = Math.random) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

module.exports = { MAX_ESTIMATED_LEVEL, estimateLevel, evidenceStatus, shuffle };
