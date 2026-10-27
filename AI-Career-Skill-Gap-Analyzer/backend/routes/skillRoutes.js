'use strict';

const express = require('express');
const { body } = require('express-validator');
const { requireAuth } = require('../middleware/authMiddleware');
const controller = require('../controllers/skillController');

const router = express.Router();

router.use(requireAuth);

const isLevelOrNull = (value) =>
  value === null || (Number.isInteger(value) && value >= 1 && value <= 5);

router.get('/', controller.listSkills);

// "/me" is registered as its own path, so it never clashes with a future "/:id".
router.get('/me', controller.getMySkills);

router.put(
  '/me',
  [
    body('skills')
      .isArray()
      .withMessage('skills must be an array')
      .bail()
      .custom((list) => list.length >= 1 && list.length <= 100)
      .withMessage('skills must contain between 1 and 100 entries'),
    body('skills.*.skillId')
      .isInt({ min: 1 })
      .withMessage('Each skill needs a skillId that is a positive whole number')
      .toInt(),
    body('skills.*.level')
      .custom(isLevelOrNull)
      .withMessage('level must be a whole number from 1 to 5, or null to clear the rating'),
  ],
  controller.saveMySkills
);

module.exports = router;
