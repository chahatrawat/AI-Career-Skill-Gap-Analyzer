'use strict';

const { validationResult } = require('express-validator');
const { httpError } = require('../middleware/errorMiddleware');
const skillService = require('../services/skillService');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

function assertValid(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw httpError(400, errors.array({ onlyFirstError: true })[0].msg);
  }
}

// GET /api/skills
const listSkills = asyncHandler(async (req, res) => {
  const data = await skillService.listSkills();
  res.json({ success: true, data });
});

// GET /api/skills/me
const getMySkills = asyncHandler(async (req, res) => {
  const data = await skillService.getUserRatings(req.user.id);
  res.json({ success: true, data });
});

// PUT /api/skills/me   body: { skills: [{ skillId, level }] }, level null clears
const saveMySkills = asyncHandler(async (req, res) => {
  assertValid(req);
  const data = await skillService.saveUserRatings(req.user.id, req.body.skills);
  res.json({ success: true, data });
});

module.exports = { listSkills, getMySkills, saveMySkills };
