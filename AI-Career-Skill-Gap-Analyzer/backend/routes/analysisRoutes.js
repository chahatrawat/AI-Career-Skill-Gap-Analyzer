'use strict';

const express = require('express');
const { body, param } = require('express-validator');
const { requireAuth } = require('../middleware/authMiddleware');
const controller = require('../controllers/analysisController');

const router = express.Router();

router.use(requireAuth);

router.post(
  '/skill-gap',
  [body('careerId').isInt({ min: 1 }).withMessage('careerId must be a positive whole number').toInt()],
  controller.runSkillGap
);

// These two fixed paths must stay above "/:id", or "history" would be read as an id.
router.get('/history', controller.getHistory);
router.get('/dashboard', controller.getDashboard);

router.get(
  '/:id',
  [param('id').isInt({ min: 1 }).withMessage('id must be a positive whole number').toInt()],
  controller.getAnalysis
);

module.exports = router;
