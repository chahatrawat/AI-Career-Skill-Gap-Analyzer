'use strict';

const { assertValid, httpError } = require('../middleware/errorMiddleware');
const careerService = require('../services/careerService');

// GET /api/careers
async function listCareers(req, res) {
  const data = await careerService.listCareers();
  res.json({ success: true, data });
}

// GET /api/careers/:id
async function getCareer(req, res) {
  assertValid(req);
  const career = await careerService.getCareerWithSkills(req.params.id);
  if (!career) throw httpError(404, 'Career not found');
  res.json({ success: true, data: career });
}

module.exports = { listCareers, getCareer };
