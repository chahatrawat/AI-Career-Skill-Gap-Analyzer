'use strict';

/**
 * The only file that talks to the AI provider (Google Gemini).
 *
 * Rules (README section 4, ROADMAP section 5):
 *  - The AI never calculates scores, statuses or durations.
 *  - Only career name, skill names/levels and weekly hours are sent.
 *  - The answer must be JSON; it is parsed and validated, and any skillId
 *    that was not sent is dropped.
 *  - On timeout, error or invalid JSON a rule-based result is returned
 *    (aiGenerated: false) instead of an error.
 *  - Neither the API key nor prompts containing user data are logged.
 */

const { sortByPriority } = require('../utils/scoring');

// ---------------------------------------------------------------------------
// Prompt templates (constants, as required)
// ---------------------------------------------------------------------------

const EXPLAIN_PROMPT = `You are a supportive career coach for IT students.
A student's skill-gap analysis has ALREADY been calculated. Do not recalculate, change or question any number, level or status.

Task:
1. Write a plain-language summary of the result (at most 120 words).
2. Choose up to 5 skills the student should work on first, most urgent first, and give a one-sentence reason for each.

Rules:
- Use only skillId values that appear in the data below.
- Do not invent scores, statistics, salaries, job-market claims or URLs.
- Answer with JSON only, in exactly this shape:
{"summary": "string", "priorities": [{"skillId": 0, "reason": "string"}]}

Data:
{{DATA}}`;

const ROADMAP_PROMPT = `You are a learning-plan designer for IT students.
Below are a career and the skills the student still needs to improve, already ordered from most to least urgent. Levels run from 1 (Beginner) to 5 (Expert); a skill with currentLevel null has not been rated yet.

Task:
Group the skills into at most 5 phases, ordered from foundations to more advanced topics. Each phase has a short title and one or more items. Every skill in the data must appear in at least one item. Each item has a short learning objective (title) and one or two sentences on what to practise (description).

Rules:
- Use only skillId values that appear in the data below.
- Do not give durations, dates, scores, course or book names, prices or URLs.
- Answer with JSON only, in exactly this shape:
{"title": "string", "summary": "one or two sentences", "phases": [{"title": "string", "items": [{"skillId": 0, "title": "string", "description": "string"}]}]}

Data:
{{DATA}}`;

const PROJECT_PROMPT = `You are a mentor who designs practical portfolio projects for IT students.
Below are a career and the skills the student still needs to improve, ordered from most to least urgent. Levels run from 1 (Beginner) to 5 (Expert); a skill with currentLevel null has not been rated yet.

Task:
Propose {{COUNT}} different hands-on projects. Each project should practise one to three of the listed skills, be realistic for a student to finish alone, and produce something they can show in a portfolio.

Rules:
- Use only skillId values that appear in the data below.
- Give each project a short title, a description of two or three sentences, and three to five concrete deliverables (things the student will have built or written).
- Do not give durations, difficulty ratings, scores, course or book names, prices or URLs.
- Answer with JSON only, in exactly this shape:
{"projects": [{"title": "string", "description": "string", "deliverables": ["string"], "skillIds": [0]}]}

Data:
{{DATA}}`;

const MAX_PRIORITIES = 5;
const MAX_PHASES = 5;
const FALLBACK_PHASE_SIZE = 3;
const MAX_TIMEOUT_MS = 30000;

// ---------------------------------------------------------------------------
// Configuration and the provider call
// ---------------------------------------------------------------------------

function getConfig() {
  let env = {};
  try {
    env = require('../config/env');
  } catch (_) {
    env = {};
  }
  const pick = (key) => (env && env[key] !== undefined ? env[key] : process.env[key]);
  const timeout = Number(pick('AI_TIMEOUT_MS')) || MAX_TIMEOUT_MS;
  return {
    provider: String(pick('AI_PROVIDER') || 'gemini').toLowerCase(),
    apiKey: pick('GEMINI_API_KEY'),
    model: pick('AI_MODEL'),
    timeoutMs: Math.min(timeout, MAX_TIMEOUT_MS),
  };
}

function isConfigured(cfg) {
  const placeholder = /^your_/i;
  return (
    cfg.provider === 'gemini' &&
    typeof cfg.apiKey === 'string' &&
    cfg.apiKey.trim() !== '' &&
    !placeholder.test(cfg.apiKey) &&
    typeof cfg.model === 'string' &&
    cfg.model.trim() !== '' &&
    !placeholder.test(cfg.model)
  );
}

async function callGemini(prompt, cfg) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      cfg.model
    )}:generateContent`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`AI provider returned HTTP ${response.status}`);
    }
    const body = await response.json();
    const parts = body && body.candidates && body.candidates[0] && body.candidates[0].content
      ? body.candidates[0].content.parts
      : null;
    const text = Array.isArray(parts) ? parts.map((p) => p.text || '').join('') : '';
    if (!text.trim()) throw new Error('AI provider returned no text');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/** Parses model output defensively: strips code fences, finds the outer {...}. */
function parseJsonText(text) {
  if (typeof text !== 'string') throw new Error('AI answer is not text');
  let cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end <= start) throw new Error('AI answer is not valid JSON');
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

/** Sends the prompt and returns parsed JSON. Throws on any failure. */
async function askForJson(template, payload, extras = {}) {
  const cfg = getConfig();
  if (!isConfigured(cfg)) throw new Error('AI provider is not configured');
  let prompt = template;
  for (const [key, value] of Object.entries(extras)) {
    prompt = prompt.replace(`{{${key}}}`, () => String(value));
  }
  prompt = prompt.replace('{{DATA}}', () => JSON.stringify(payload));
  const text = await callGemini(prompt, cfg);
  return parseJsonText(text);
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const isText = (value) => typeof value === 'string' && value.trim() !== '';
const clip = (value, max) => String(value).trim().slice(0, max);

function joinNames(names) {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function gapOf(skill) {
  if (typeof skill.gap === 'number') return skill.gap;
  const current = skill.currentLevel === null || skill.currentLevel === undefined ? 0 : skill.currentLevel;
  return Math.max(0, skill.requiredLevel - current);
}

/** Only the fields the AI is allowed to see. */
function pickSkillFields(skill) {
  return {
    skillId: skill.skillId,
    name: skill.name,
    currentLevel: skill.currentLevel === undefined ? null : skill.currentLevel,
    requiredLevel: skill.requiredLevel,
    importance: skill.importance,
    ...(skill.status ? { status: skill.status } : {}),
    gap: gapOf(skill),
  };
}

function sentIds(skills) {
  return new Set(skills.map((s) => s.skillId));
}

// ---------------------------------------------------------------------------
// explainSkillGap
// ---------------------------------------------------------------------------

function fallbackExplanation(input) {
  const skills = input.skills || [];
  const counts = { met: 0, gap: 0, missing: 0 };
  skills.forEach((s) => {
    if (counts[s.status] !== undefined) counts[s.status] += 1;
  });

  const needWork = sortByPriority(
    skills
      .filter((s) => s.status !== 'met')
      .map((s) => ({ ...s, priority: gapOf(s) * s.importance }))
  ).slice(0, 3);

  let summary =
    `You are ${input.readinessScore}% ready for ${input.careerName}. ` +
    `You meet ${counts.met} of ${skills.length} required skills; ` +
    `${counts.gap} need improvement and ${counts.missing} are not rated yet.`;
  if (needWork.length > 0) {
    summary += ` Focus first on ${joinNames(needWork.map((s) => s.name))}.`;
  } else {
    summary += ' Keep practising to stay at this level.';
  }

  const priorities = needWork.map((s) => ({
    skillId: s.skillId,
    reason:
      s.status === 'missing'
        ? `Not rated yet; level ${s.requiredLevel} is required (importance ${s.importance} of 3).`
        : `You are ${gapOf(s)} level${gapOf(s) === 1 ? '' : 's'} below the required level ${s.requiredLevel} (importance ${s.importance} of 3).`,
  }));

  return { aiGenerated: false, summary, priorities };
}

function validateExplanation(raw, input) {
  if (!raw || typeof raw !== 'object' || !isText(raw.summary)) {
    throw new Error('AI explanation has no summary');
  }
  const ids = sentIds(input.skills);
  const seen = new Set();
  const priorities = [];
  const rawList = Array.isArray(raw.priorities) ? raw.priorities : [];
  for (const entry of rawList) {
    if (priorities.length >= MAX_PRIORITIES) break;
    if (!entry || !isText(entry.reason)) continue;
    const id = Number(entry.skillId);
    if (!Number.isInteger(id) || !ids.has(id) || seen.has(id)) continue;
    seen.add(id);
    priorities.push({ skillId: id, reason: clip(entry.reason, 500) });
  }
  const needsWork = input.skills.some((s) => s.status !== 'met');
  if (needsWork && priorities.length === 0) {
    throw new Error('AI explanation has no usable priorities');
  }
  return { aiGenerated: true, summary: clip(raw.summary, 1200), priorities };
}

/**
 * input: { careerName, readinessScore, skills: [{ skillId, name, currentLevel,
 *          requiredLevel, importance, status, gap }] }
 * returns { aiGenerated, summary, priorities: [{ skillId, reason }] }
 */
async function explainSkillGap(input) {
  const payload = {
    careerName: input.careerName,
    readinessScore: input.readinessScore,
    skills: (input.skills || []).map(pickSkillFields),
  };
  try {
    const raw = await askForJson(EXPLAIN_PROMPT, payload);
    return validateExplanation(raw, payload);
  } catch (err) {
    console.warn(`[aiService] explainSkillGap fell back: ${err.message}`);
    return fallbackExplanation({ ...payload, skills: input.skills || [] });
  }
}

// ---------------------------------------------------------------------------
// generateRoadmap
// ---------------------------------------------------------------------------

function plainItem(gap) {
  const from = gap.currentLevel === null || gap.currentLevel === undefined ? 0 : gap.currentLevel;
  return {
    skillId: gap.skillId,
    title: clip(`Improve ${gap.name} from level ${from} to ${gap.requiredLevel}`, 200),
    description: `Practise ${gap.name} until you can work at level ${gap.requiredLevel}.`,
  };
}

function fallbackRoadmap(input) {
  const gaps = input.gaps || [];
  const phases = [];
  for (let i = 0; i < gaps.length; i += FALLBACK_PHASE_SIZE) {
    phases.push({
      title: `Phase ${phases.length + 1}`,
      items: gaps.slice(i, i + FALLBACK_PHASE_SIZE).map(plainItem),
    });
  }
  return {
    aiGenerated: false,
    title: clip(`${input.careerName} plan`, 200),
    summary: `A step-by-step plan for ${gaps.length} skill${gaps.length === 1 ? '' : 's'}, starting with the most urgent.`,
    phases,
  };
}

function validateRoadmap(raw, input) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.phases)) {
    throw new Error('AI roadmap has no phases');
  }
  if (raw.phases.length > MAX_PHASES) {
    throw new Error('AI roadmap has too many phases');
  }
  const gaps = input.gaps;
  const ids = sentIds(gaps);
  const byId = new Map(gaps.map((g) => [g.skillId, g]));
  const covered = new Set();

  const phases = [];
  for (const rawPhase of raw.phases) {
    if (!rawPhase || !Array.isArray(rawPhase.items)) continue;
    const items = [];
    for (const rawItem of rawPhase.items) {
      if (!rawItem) continue;
      const id = Number(rawItem.skillId);
      if (!Number.isInteger(id) || !ids.has(id)) continue; // drop unknown skill IDs
      covered.add(id);
      const fallback = plainItem(byId.get(id));
      items.push({
        skillId: id,
        title: isText(rawItem.title) ? clip(rawItem.title, 200) : fallback.title,
        description: isText(rawItem.description) ? clip(rawItem.description, 1000) : fallback.description,
      });
    }
    if (items.length === 0) continue;
    phases.push({
      title: isText(rawPhase.title) ? clip(rawPhase.title, 150) : `Phase ${phases.length + 1}`,
      items,
    });
  }
  if (phases.length === 0) throw new Error('AI roadmap has no usable items');

  // Every gap skill must appear at least once.
  const left = gaps.filter((g) => !covered.has(g.skillId));
  if (left.length > 0) {
    phases[phases.length - 1].items.push(...left.map(plainItem));
  }

  return {
    aiGenerated: true,
    title: isText(raw.title) ? clip(raw.title, 200) : clip(`${input.careerName} plan`, 200),
    summary: isText(raw.summary) ? clip(raw.summary, 1000) : '',
    phases,
  };
}

/**
 * input: { careerName, weeklyHours, gaps: [{ skillId, name, currentLevel,
 *          requiredLevel, importance, gap }] }   (priority order, gap/missing only)
 * returns { aiGenerated, title, summary, phases: [{ title, items: [{ skillId, title, description }] }] }
 * Durations are NOT produced here; roadmapService calculates them.
 */
async function generateRoadmap(input) {
  const payload = {
    careerName: input.careerName,
    weeklyHours: input.weeklyHours,
    gaps: (input.gaps || []).map(pickSkillFields),
  };
  if (payload.gaps.length === 0) return fallbackRoadmap(payload);
  try {
    const raw = await askForJson(ROADMAP_PROMPT, payload);
    return validateRoadmap(raw, payload);
  } catch (err) {
    console.warn(`[aiService] generateRoadmap fell back: ${err.message}`);
    return fallbackRoadmap(payload);
  }
}

// ---------------------------------------------------------------------------
// generateProjects (AI Project Lab)
// ---------------------------------------------------------------------------

const MAX_PROJECTS = 5;

// Rule-based project ideas per skill category, used when the AI is unavailable.
const PROJECT_TEMPLATES = {
  'Programming Languages': (n) => ({
    title: `${n} command-line toolkit`,
    description: `Build a small command-line tool that solves a real everyday task, such as a budget tracker or file organiser, using ${n}. Keep the code in small functions and add a README.`,
    deliverables: ['Working command-line program', 'At least five small, well-named functions', 'A README with usage examples', 'A short list of known limitations'],
  }),
  'Web Frontend': (n) => ({
    title: `Responsive portfolio page with ${n}`,
    description: `Create a personal portfolio page that adapts to phones and desktops and practises ${n}. Focus on clean structure, readable styling and accessibility.`,
    deliverables: ['Three-section responsive page', 'Works at 360px and 1280px widths', 'Keyboard-accessible navigation', 'Deployed or zipped project folder'],
  }),
  'Web Backend': (n) => ({
    title: `Notes API using ${n}`,
    description: `Build a small REST API for notes (create, read, update, delete) that practises ${n}. Validate input and return clear status codes and error messages.`,
    deliverables: ['CRUD endpoints for notes', 'Input validation with clear error responses', 'A documented list of routes', 'A few automated tests'],
  }),
  Databases: (n) => ({
    title: `Library database with ${n}`,
    description: `Design a database for a small library (books, members, loans) to practise ${n}. Write the queries a librarian would need and explain your table design.`,
    deliverables: ['Table design diagram', 'Schema and sample-data scripts', 'Ten useful queries including joins and grouping', 'A one-page design explanation'],
  }),
  'Tools and DevOps': (n) => ({
    title: `Automate a workflow with ${n}`,
    description: `Pick a small project of your own and use ${n} to make it repeatable: scripted setup, clear steps and a short guide so someone else can run it.`,
    deliverables: ['Repository with a clean history', 'Setup instructions that work on a fresh machine', 'One automated check or script', 'A short write-up of what you learned'],
  }),
  'CS Fundamentals': (n) => ({
    title: `${n} practice workbook`,
    description: `Implement and explain a set of classic problems that exercise ${n}. Compare at least two approaches to one problem and note how they differ in speed.`,
    deliverables: ['Eight solved problems in code', 'Notes comparing two approaches', 'Test cases for each solution', 'A short reflection on the hardest problem'],
  }),
  'Data and Analytics': (n) => ({
    title: `Analyse an open dataset with ${n}`,
    description: `Choose a free public dataset that interests you and use ${n} to clean it, explore it and answer three questions with evidence.`,
    deliverables: ['Cleaned dataset and a note on what was fixed', 'Three charts or tables answering your questions', 'A one-page findings summary', 'Reproducible notebook or script'],
  }),
  'Machine Learning': (n) => ({
    title: `Predictive model project: ${n}`,
    description: `Train and evaluate a simple model on a public dataset to practise ${n}. Report how well it works on unseen data and where it fails.`,
    deliverables: ['Notebook with data preparation steps', 'Train/test split and at least one metric', 'Comparison with a simple baseline', 'A short note on limitations'],
  }),
  Professional: (n) => ({
    title: `${n} case-study write-up`,
    description: `Document one of your own projects as a case study: the problem, your approach, the result and what you would change. Present it in plain language for a non-technical reader.`,
    deliverables: ['One-page case study', 'Five-slide or five-minute presentation', 'Feedback from one other person', 'A revised version using that feedback'],
  }),
};

function fallbackProjects(input) {
  const gaps = input.gaps || [];
  const wanted = Math.min(input.count || 3, MAX_PROJECTS);
  const projects = [];
  for (const skill of gaps) {
    if (projects.length >= wanted) break;
    const make = PROJECT_TEMPLATES[skill.category] || PROJECT_TEMPLATES['Programming Languages'];
    const base = make(skill.name);
    projects.push({ ...base, skillIds: [skill.skillId] });
  }
  return { aiGenerated: false, projects };
}

function validateProjects(raw, input) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.projects)) {
    throw new Error('AI project list is missing');
  }
  const ids = sentIds(input.gaps);
  const projects = [];
  for (const entry of raw.projects) {
    if (projects.length >= MAX_PROJECTS) break;
    if (!entry || !isText(entry.title) || !isText(entry.description)) continue;
    const skillIds = [];
    for (const value of Array.isArray(entry.skillIds) ? entry.skillIds : []) {
      const id = Number(value);
      if (Number.isInteger(id) && ids.has(id) && !skillIds.includes(id)) skillIds.push(id);
    }
    if (skillIds.length === 0) continue; // a project must practise at least one known skill
    const deliverables = (Array.isArray(entry.deliverables) ? entry.deliverables : [])
      .filter(isText)
      .map((d) => clip(d, 200))
      .slice(0, 6);
    if (deliverables.length < 2) continue;
    projects.push({
      title: clip(entry.title, 200),
      description: clip(entry.description, 1200),
      deliverables,
      skillIds: skillIds.slice(0, 3),
    });
  }
  if (projects.length === 0) throw new Error('AI returned no usable projects');
  return { aiGenerated: true, projects };
}

/**
 * input: { careerName, count, gaps: [{ skillId, name, category, currentLevel, requiredLevel, importance, gap }] }
 * returns { aiGenerated, projects: [{ title, description, deliverables[], skillIds[] }] }
 * Difficulty and estimated hours are NOT produced here; projectService calculates them.
 */
async function generateProjects(input) {
  const count = Math.min(Math.max(Number(input.count) || 3, 1), MAX_PROJECTS);
  const gaps = (input.gaps || []).map((g) => ({ ...pickSkillFields(g), category: g.category || null }));
  const payload = { careerName: input.careerName, gaps };
  if (gaps.length === 0) return { aiGenerated: false, projects: [] };
  try {
    const raw = await askForJson(PROJECT_PROMPT, { careerName: payload.careerName, gaps: gaps.map(({ category, ...rest }) => rest) }, { COUNT: count });
    return validateProjects(raw, payload);
  } catch (err) {
    console.warn(`[aiService] generateProjects fell back: ${err.message}`);
    return fallbackProjects({ gaps, count });
  }
}

module.exports = {
  explainSkillGap,
  generateRoadmap,
  generateProjects,
  // exposed for unit tests only
  __test: { parseJsonText, validateExplanation, validateRoadmap, fallbackExplanation, fallbackRoadmap, isConfigured, validateProjects, fallbackProjects },
};
