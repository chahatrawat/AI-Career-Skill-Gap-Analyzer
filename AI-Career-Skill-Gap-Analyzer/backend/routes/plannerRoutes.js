'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');
const { requireAuth } = require('../middleware/authMiddleware');
const controller = require('../controllers/plannerController');
const { isYmd } = require('../utils/planner');

const router = express.Router();
router.use(requireAuth);

const idParam = param('id').isInt({ min: 1 }).withMessage('id must be a positive whole number').toInt();
const dateRule = (chain) => chain.custom(isYmd).withMessage('Date must look like 2026-01-31');
const minutes = (chain) => chain.isInt({ min: 10, max: 600 }).withMessage('Minutes must be between 10 and 600').toInt();

router.get('/week', [dateRule(query('week').optional()), dateRule(query('today').optional())], controller.getWeek);
router.get('/items', controller.listItems);
router.post('/auto-plan', [dateRule(body('week').optional()), dateRule(body('today').optional())], controller.autoPlan);

router.post(
  '/sessions',
  [
    body('title').isString().trim().isLength({ min: 1, max: 200 }).withMessage('Title must be 1 to 200 characters'),
    dateRule(body('plannedDate')),
    minutes(body('plannedMinutes')),
    body('roadmapItemId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('roadmapItemId must be a positive whole number').toInt(),
  ],
  controller.create
);

router.patch(
  '/sessions/:id',
  [
    idParam,
    body('title').optional().isString().trim().isLength({ min: 1, max: 200 }).withMessage('Title must be 1 to 200 characters'),
    dateRule(body('plannedDate').optional()),
    minutes(body('plannedMinutes').optional()),
    body('completedMinutes').optional().isInt({ min: 0, max: 600 }).withMessage('completedMinutes must be between 0 and 600').toInt(),
    body('status').optional().isIn(['planned', 'done', 'skipped']).withMessage('status must be planned, done or skipped'),
  ],
  controller.update
);

router.delete('/sessions/:id', [idParam], controller.remove);

module.exports = router;
