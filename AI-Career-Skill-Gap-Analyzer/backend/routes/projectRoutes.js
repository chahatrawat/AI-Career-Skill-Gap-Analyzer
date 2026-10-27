'use strict';

const express = require('express');
const { body, param } = require('express-validator');
const { requireAuth } = require('../middleware/authMiddleware');
const controller = require('../controllers/projectController');

const router = express.Router();
router.use(requireAuth);

const idParam = param('id').isInt({ min: 1 }).withMessage('id must be a positive whole number').toInt();

router.get('/', controller.list);
router.post('/suggest', controller.suggest);
router.patch(
  '/:id',
  [idParam, body('status').isIn(['suggested', 'in_progress', 'completed']).withMessage('status must be suggested, in_progress or completed')],
  controller.setStatus
);
router.delete('/:id', [idParam], controller.remove);

module.exports = router;
