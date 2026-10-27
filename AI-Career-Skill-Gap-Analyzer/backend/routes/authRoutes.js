'use strict';

const express = require('express');
const { body } = require('express-validator');
const { requireAuth } = require('../middleware/authMiddleware');
const controller = require('../controllers/authController');

const router = express.Router();

const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced'];
const LEARNING_FORMATS = ['video', 'reading', 'practice', 'mixed'];

// bcrypt only reads the first 72 bytes of a password.
const atMost72Bytes = (value) => Buffer.byteLength(value, 'utf8') <= 72;

const registerRules = [
  body('name')
    .isString().withMessage('name is required').bail()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('name must be 2 to 100 characters'),
  body('email')
    .isString().withMessage('email is required').bail()
    .trim()
    .isEmail().withMessage('email must be a valid email address').bail()
    .isLength({ max: 255 }).withMessage('email is too long'),
  body('password')
    .isString().withMessage('password is required').bail()
    .isLength({ min: 8 }).withMessage('password must be at least 8 characters').bail()
    .custom(atMost72Bytes).withMessage('password must be at most 72 bytes long'),
];

const loginRules = [
  body('email')
    .isString().withMessage('email is required').bail()
    .trim()
    .isEmail().withMessage('email must be a valid email address'),
  body('password')
    .isString().withMessage('password is required').bail()
    .notEmpty().withMessage('password is required').bail()
    .isLength({ max: 128 }).withMessage('password is too long'),
];

// Every field is optional; only the ones sent are changed.
const updateRules = [
  body('name')
    .optional()
    .isString().withMessage('name must be text').bail()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('name must be 2 to 100 characters'),
  body('educationLevel')
    .optional({ nullable: true })
    .isString().withMessage('educationLevel must be text or null').bail()
    .isLength({ max: 100 }).withMessage('educationLevel must be at most 100 characters'),
  body('experienceLevel')
    .optional({ nullable: true })
    .isIn(EXPERIENCE_LEVELS).withMessage(`experienceLevel must be one of: ${EXPERIENCE_LEVELS.join(', ')}`),
  body('weeklyStudyHours')
    .optional()
    .isInt({ min: 1, max: 60 }).withMessage('weeklyStudyHours must be a whole number from 1 to 60')
    .toInt(),
  body('learningFormat')
    .optional()
    .isIn(LEARNING_FORMATS).withMessage(`learningFormat must be one of: ${LEARNING_FORMATS.join(', ')}`),
  body('targetCareerId')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('targetCareerId must be a positive whole number or null')
    .toInt(),
];

router.post('/register', registerRules, controller.register);
router.post('/login', loginRules, controller.login);
router.get('/me', requireAuth, controller.getMe);
router.put('/me', requireAuth, updateRules, controller.updateMe);

module.exports = router;
