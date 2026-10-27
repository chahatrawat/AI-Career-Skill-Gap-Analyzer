'use strict';

/**
 * Error handling shared by the whole backend.
 *
 * Exports:
 *   httpError(status, message, details?)  create an error the client may see
 *   assertValid(req)                      throw a 400 if express-validator found problems
 *   notFoundHandler, errorHandler         register these LAST in app.js
 *
 * Express 5 sends anything thrown (or rejected) inside a route handler to errorHandler,
 * so handlers do not need try/catch just to forward errors.
 *
 * Every error response has the same shape:
 *   { "success": false, "error": { "message": "...", "details": [...] } }
 * Stack traces, SQL, and internal messages are never sent to the client.
 */

const { validationResult } = require('express-validator');
const env = require('../config/env');

function httpError(status, message, details) {
  const error = new Error(message);
  error.status = status;
  error.expose = true; // safe to show this message to the client
  if (details !== undefined) error.details = details;
  return error;
}

/** Call inside a controller after the express-validator chains have run. */
function assertValid(req) {
  const result = validationResult(req);
  if (result.isEmpty()) return;
  const details = result.array().map((item) => ({
    field: item.path ?? item.param ?? 'request',
    message: item.msg,
  }));
  throw httpError(400, 'Validation failed', details);
}

function notFoundHandler(req, res, next) {
  next(httpError(404, 'Route not found'));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  let status = 500;
  let message = 'Something went wrong. Please try again.';
  let details;

  if (err && err.expose && Number.isInteger(err.status)) {
    status = err.status;
    message = err.message;
    details = err.details;
  } else if (err && err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body is not valid JSON.';
  } else if (err && err.type === 'entity.too.large') {
    status = 413;
    message = 'Request body is too large.';
  } else if (err && err.code === 'ER_DUP_ENTRY') {
    status = 409;
    message = 'That record already exists.';
  } else if (err && (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW')) {
    status = 400;
    message = 'A referenced record does not exist.';
  }

  if (status >= 500) {
    console.error('[error]', req.method, req.originalUrl, env.isProduction ? err && err.message : err && err.stack);
  }

  const error = details === undefined ? { message } : { message, details };
  return res.status(status).json({ success: false, error });
}

module.exports = { httpError, assertValid, notFoundHandler, errorHandler };
