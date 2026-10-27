'use strict';

const { assertValid } = require('../middleware/errorMiddleware');
const quizService = require('../services/quizService');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

// GET /api/quiz/skills
const listSkills = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await quizService.listQuizSkills(req.user.id) });
});

// GET /api/quiz/evidence
const getEvidence = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await quizService.getEvidence(req.user.id) });
});

// GET /api/quiz/skills/:skillId
const getQuiz = asyncHandler(async (req, res) => {
  assertValid(req);
  res.json({ success: true, data: await quizService.getQuiz(req.params.skillId) });
});

// POST /api/quiz/skills/:skillId/submit   body: { answers: [{ questionId, optionId }], applyToRating? }
const submit = asyncHandler(async (req, res) => {
  assertValid(req);
  const data = await quizService.submitQuiz(
    req.user.id,
    req.params.skillId,
    req.body.answers,
    req.body.applyToRating === true
  );
  res.status(201).json({ success: true, data });
});

module.exports = { listSkills, getEvidence, getQuiz, submit };
