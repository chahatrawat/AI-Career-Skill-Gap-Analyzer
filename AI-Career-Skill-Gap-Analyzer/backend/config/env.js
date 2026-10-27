'use strict';

/**
 * Loads backend/.env, validates it once at startup, and exports ONE frozen object.
 * Every other file reads settings from here, never from process.env directly.
 *
 * Shape (this is the contract other files rely on):
 *   env.nodeEnv        'development' | 'production' | 'test'
 *   env.isProduction   boolean
 *   env.port           number
 *   env.corsOrigins    string[]
 *   env.db             { host, port, user, password, name }
 *   env.jwt            { secret, expiresIn }   expiresIn is seconds (number) or a string like '7d', '12h'
 *   env.ai             { provider, apiKey, model, timeoutMs, enabled }
 *
 * env.ai.enabled is false when the key or model is missing or still a "your_..." placeholder.
 * In that case aiService.js must use its rule-based fallback.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const problems = [];

function text(name, fallback = '') {
  const value = process.env[name];
  return value === undefined || value.trim() === '' ? fallback : value.trim();
}

function requiredText(name) {
  const value = text(name);
  if (!value) problems.push(`${name} is missing`);
  return value;
}

function integer(name, fallback, min, max) {
  const raw = text(name);
  if (raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    problems.push(`${name} must be a whole number between ${min} and ${max}`);
    return fallback;
  }
  return value;
}

const isPlaceholder = (value) => !value || value.toLowerCase().startsWith('your_');

const nodeEnv = text('NODE_ENV', 'development');
const isProduction = nodeEnv === 'production';

// ---- Database ----
const db = {
  host: requiredText('DB_HOST'),
  port: integer('DB_PORT', 3306, 1, 65535),
  user: requiredText('DB_USER'),
  password: process.env.DB_PASSWORD || '', // may be empty on a local machine; do not trim
  name: requiredText('DB_NAME'),
};

// ---- JWT ----
const jwtSecret = requiredText('JWT_SECRET');
if (jwtSecret && jwtSecret.length < 16) {
  problems.push('JWT_SECRET must be at least 16 characters long');
}
if (isProduction && jwtSecret === 'change_this_to_a_long_random_secret') {
  problems.push('JWT_SECRET is still the example value; set a real secret in production');
}
// JWT_EXPIRES_IN: a plain whole number means seconds; otherwise it needs a unit such as 7d, 12h, 30m.
// (jsonwebtoken reads a bare number string like "120" as milliseconds, so we convert it to a number.)
const DURATION = /^\d+\s*(ms|s|secs?|seconds?|m|mins?|minutes?|h|hrs?|hours?|d|days?|w|weeks?|y|yrs?|years?)$/i;
const rawExpiresIn = text('JWT_EXPIRES_IN', '7d');
let expiresIn = rawExpiresIn;
if (/^\d+$/.test(rawExpiresIn)) {
  expiresIn = Number(rawExpiresIn);
  if (expiresIn < 1) problems.push('JWT_EXPIRES_IN must be greater than 0');
} else if (!DURATION.test(rawExpiresIn)) {
  problems.push("JWT_EXPIRES_IN must look like '7d', '12h', '30m', or be a number of seconds");
}
const jwt = { secret: jwtSecret, expiresIn };

// ---- AI (Gemini is the only supported provider) ----
const provider = text('AI_PROVIDER', 'gemini').toLowerCase();
if (provider !== 'gemini') problems.push("AI_PROVIDER must be 'gemini'");
const apiKey = text('GEMINI_API_KEY');
const model = text('AI_MODEL');
const ai = {
  provider,
  apiKey,
  model,
  timeoutMs: integer('AI_TIMEOUT_MS', 30000, 1000, 120000),
  enabled: !isPlaceholder(apiKey) && !isPlaceholder(model),
};

// ---- Server ----
const port = integer('PORT', 5000, 1, 65535);
const corsOrigins = text('CORS_ORIGIN', 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (problems.length > 0) {
  throw new Error(
    'Invalid environment configuration:\n - ' +
      problems.join('\n - ') +
      '\nCheck backend/.env (see backend/.env.example).'
  );
}

if (!ai.enabled && nodeEnv !== 'test') {
  console.warn('[env] AI is not configured, so the rule-based fallback will be used.');
}

module.exports = Object.freeze({
  nodeEnv,
  isProduction,
  port,
  corsOrigins,
  db: Object.freeze(db),
  jwt: Object.freeze(jwt),
  ai: Object.freeze(ai),
});
