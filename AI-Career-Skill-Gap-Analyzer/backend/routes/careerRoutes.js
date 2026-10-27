'use strict';

const express = require('express');
const { param } = require('express-validator');
const { requireAuth } = require('../middleware/authMiddleware');
const controller = require('../controllers/careerController');

const router = express.Router();

router.use(requireAuth);

router.get('/', controller.listCareers);

router.get(
  '/:id',
  [param('id').isInt({ min: 1 }).withMessage('id must be a positive whole number').toInt()],
  controller.getCareer
);

module.exports = router;
