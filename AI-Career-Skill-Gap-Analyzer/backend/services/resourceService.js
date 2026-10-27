'use strict';

const { BANK } = require('../data/resourceBank');

const TYPE_FOR_FORMAT = {
  video: ['video', 'course'],
  reading: ['docs'],
  practice: ['practice', 'interactive'],
  mixed: [],
};

/**
 * Resources for one skill. Curated links first (the user's preferred learning
 * format first among them), then one generated search link as a safety net.
 */
function resourcesFor(slug, skillName, learningFormat = 'mixed') {
  const preferred = TYPE_FOR_FORMAT[learningFormat] || [];
  const curated = (BANK[slug] || [])
    .map((r, index) => ({ r, index }))
    .sort((a, b) => {
      const pa = preferred.includes(a.r.type) ? 0 : 1;
      const pb = preferred.includes(b.r.type) ? 0 : 1;
      return pa - pb || a.index - b.index;
    })
    .map(({ r }) => ({ ...r, curated: true }));

  const name = skillName || slug;
  curated.push({
    title: `Search: ${name} tutorials`,
    url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} tutorial for beginners`)}`,
    type: 'video',
    level: 'beginner',
    curated: false,
  });
  return curated;
}

module.exports = { resourcesFor, TYPE_FOR_FORMAT };
