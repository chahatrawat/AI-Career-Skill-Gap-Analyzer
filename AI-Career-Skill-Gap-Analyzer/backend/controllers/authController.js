'use strict';

const { assertValid } = require('../middleware/errorMiddleware');
const authService = require('../services/authService');

// Only these fields can be changed through PUT /api/auth/me. Anything else in the body is ignored.
const PROFILE_FIELDS = [
  'name',
  'educationLevel',
  'experienceLevel',
  'weeklyStudyHours',
  'learningFormat',
  'targetCareerId',
];

// POST /api/auth/register   body: { name, email, password }
async function register(req, res) {
  assertValid(req);
  const { name, email, password } = req.body;
  const data = await authService.register({ name, email, password });
  res.status(201).json({ success: true, data });
}

// POST /api/auth/login   body: { email, password }
async function login(req, res) {
  assertValid(req);
  const { email, password } = req.body;
  const data = await authService.login({ email, password });
  res.json({ success: true, data });
}

// GET /api/auth/me
async function getMe(req, res) {
  const data = await authService.getMe(req.user.id);
  res.json({ success: true, data });
}

// PUT /api/auth/me   body: any of name, educationLevel, experienceLevel,
//                    weeklyStudyHours, learningFormat, targetCareerId (null clears where allowed)
async function updateMe(req, res) {
  assertValid(req);
  const input = {};
  for (const field of PROFILE_FIELDS) {
    if (req.body[field] !== undefined) input[field] = req.body[field];
  }
  // A blank education level means "clear it".
  if (typeof input.educationLevel === 'string') {
    input.educationLevel = input.educationLevel.trim() || null;
  }
  const data = await authService.updateProfile(req.user.id, input);
  res.json({ success: true, data });
}

module.exports = { register, login, getMe, updateMe };
