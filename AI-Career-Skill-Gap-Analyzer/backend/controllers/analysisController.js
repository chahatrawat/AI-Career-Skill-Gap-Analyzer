'use strict';

const { validationResult } = require('express-validator');
const { httpError } = require('../middleware/errorMiddleware');
const analysisService = require('../services/analysisService');
const { isYmd } = require('../utils/planner');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

function assertValid(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw httpError(400, errors.array({ onlyFirstError: true })[0].msg);
  }
}

// POST /api/analysis/skill-gap   body: { careerId }
const runSkillGap = asyncHandler(async (req, res) => {
  assertValid(req);
  const data = await analysisService.runSkillGap(req.user.id, req.body.careerId);
  res.status(201).json({ success: true, data });
});

// GET /api/analysis/history
const getHistory = asyncHandler(async (req, res) => {
  const data = await analysisService.listHistory(req.user.id);
  res.json({ success: true, data });
});

// GET /api/analysis/dashboard
const getDashboard = asyncHandler(async (req, res) => {
  const data = await analysisService.getDashboard(req.user.id, isYmd(req.query.today) ? req.query.today : undefined);
  res.json({ success: true, data });
});

// GET /api/analysis/:id
const getAnalysis = asyncHandler(async (req, res) => {
  assertValid(req);
  const data = await analysisService.getAssessment(req.user.id, req.params.id);
  res.json({ success: true, data });
});

module.exports = { runSkillGap, getHistory, getDashboard, getAnalysis };
