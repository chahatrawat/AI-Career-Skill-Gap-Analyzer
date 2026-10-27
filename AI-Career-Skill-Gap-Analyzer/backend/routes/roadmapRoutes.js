'use strict';

const express = require('express');
const { body, param } = require('express-validator');
const { requireAuth } = require('../middleware/authMiddleware');
const controller = require('../controllers/roadmapController');

const router = express.Router();

router.use(requireAuth);

const idParam = (name) =>
  param(name).isInt({ min: 1 }).withMessage(`${name} must be a positive whole number`).toInt();

router.post(
  '/',
  [
    body('assessmentId')
      .isInt({ min: 1 })
      .withMessage('assessmentId must be a positive whole number')
      .toInt(),
    body('weeklyHours')
      .optional({ nullable: true })
      .isInt({ min: 1, max: 60 })
      .withMessage('weeklyHours must be a whole number from 1 to 60')
      .toInt(),
  ],
  controller.createRoadmap
);

router.get('/', controller.listRoadmaps);

router.get('/:id', [idParam('id')], controller.getRoadmap);

router.patch(
  '/:id/items/:itemId',
  [
    idParam('id'),
    idParam('itemId'),
    body('status')
      .isIn(['not_started', 'in_progress', 'completed'])
      .withMessage('status must be not_started, in_progress or completed'),
  ],
  controller.updateItem
);

router.delete('/:id', [idParam('id')], controller.deleteRoadmap);

module.exports = router;
