'use strict';

const express = require('express');
const { body, param } = require('express-validator');
const { requireAuth } = require('../middleware/authMiddleware');
const controller = require('../controllers/quizController');

const router = express.Router();
router.use(requireAuth);

const skillParam = param('skillId').isInt({ min: 1 }).withMessage('skillId must be a positive whole number').toInt();

router.get('/skills', controller.listSkills);
router.get('/evidence', controller.getEvidence);
router.get('/skills/:skillId', [skillParam], controller.getQuiz);
router.post(
  '/skills/:skillId/submit',
  [
    skillParam,
    body('answers').isArray({ min: 1, max: 20 }).withMessage('answers must be a list'),
    body('answers.*.questionId').isInt({ min: 0 }).withMessage('Each answer needs a questionId').toInt(),
    body('answers.*.optionId').isInt({ min: 0 }).withMessage('Each answer needs an optionId').toInt(),
    body('applyToRating').optional().isBoolean().withMessage('applyToRating must be true or false'),
  ],
  controller.submit
);

module.exports = router;
