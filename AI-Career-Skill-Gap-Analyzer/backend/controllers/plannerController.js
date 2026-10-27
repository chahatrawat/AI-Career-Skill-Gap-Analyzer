'use strict';

const { assertValid } = require('../middleware/errorMiddleware');
const plannerService = require('../services/plannerService');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

const getWeek = asyncHandler(async (req, res) => {
  assertValid(req);
  res.json({ success: true, data: await plannerService.getWeek(req.user.id, req.query.week, req.query.today) });
});
const listItems = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await plannerService.listPlannableItems(req.user.id) });
});
const create = asyncHandler(async (req, res) => {
  assertValid(req);
  res.status(201).json({ success: true, data: await plannerService.createSession(req.user.id, req.body) });
});
const update = asyncHandler(async (req, res) => {
  assertValid(req);
  const { title, plannedDate, plannedMinutes, completedMinutes, status } = req.body;
  res.json({
    success: true,
    data: await plannerService.updateSession(req.user.id, req.params.id, { title, plannedDate, plannedMinutes, completedMinutes, status }),
  });
});
const remove = asyncHandler(async (req, res) => {
  assertValid(req);
  res.json({ success: true, data: await plannerService.deleteSession(req.user.id, req.params.id) });
});
const autoPlan = asyncHandler(async (req, res) => {
  assertValid(req);
  res.status(201).json({ success: true, data: await plannerService.autoPlan(req.user.id, req.body.week, req.body.today) });
});

module.exports = { getWeek, listItems, create, update, remove, autoPlan };
