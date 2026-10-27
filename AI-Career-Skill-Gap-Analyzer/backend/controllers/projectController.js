'use strict';

const { assertValid } = require('../middleware/errorMiddleware');
const projectService = require('../services/projectService');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

const list = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await projectService.listProjects(req.user.id) });
});
const suggest = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await projectService.suggestProjects(req.user.id) });
});
const setStatus = asyncHandler(async (req, res) => {
  assertValid(req);
  res.json({ success: true, data: await projectService.updateProjectStatus(req.user.id, req.params.id, req.body.status) });
});
const remove = asyncHandler(async (req, res) => {
  assertValid(req);
  res.json({ success: true, data: await projectService.deleteProject(req.user.id, req.params.id) });
});

module.exports = { list, suggest, setStatus, remove };
