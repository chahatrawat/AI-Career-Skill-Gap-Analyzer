'use strict';

const { validationResult } = require('express-validator');
const { httpError } = require('../middleware/errorMiddleware');
const roadmapService = require('../services/roadmapService');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

function assertValid(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw httpError(400, errors.array({ onlyFirstError: true })[0].msg);
  }
}

// POST /api/roadmaps   body: { assessmentId, weeklyHours? }
const createRoadmap = asyncHandler(async (req, res) => {
  assertValid(req);
  const data = await roadmapService.createRoadmap(req.user.id, {
    assessmentId: req.body.assessmentId,
    weeklyHours: req.body.weeklyHours,
  });
  res.status(201).json({ success: true, data });
});

// GET /api/roadmaps
const listRoadmaps = asyncHandler(async (req, res) => {
  const data = await roadmapService.listRoadmaps(req.user.id);
  res.json({ success: true, data });
});

// GET /api/roadmaps/:id
const getRoadmap = asyncHandler(async (req, res) => {
  assertValid(req);
  const data = await roadmapService.getRoadmap(req.user.id, req.params.id);
  res.json({ success: true, data });
});

// PATCH /api/roadmaps/:id/items/:itemId   body: { status }
const updateItem = asyncHandler(async (req, res) => {
  assertValid(req);
  const data = await roadmapService.updateItemStatus(
    req.user.id,
    req.params.id,
    req.params.itemId,
    req.body.status
  );
  res.json({ success: true, data });
});

// DELETE /api/roadmaps/:id
const deleteRoadmap = asyncHandler(async (req, res) => {
  assertValid(req);
  const data = await roadmapService.deleteRoadmap(req.user.id, req.params.id);
  res.json({ success: true, data });
});

module.exports = { createRoadmap, listRoadmaps, getRoadmap, updateItem, deleteRoadmap };
