'use strict';

/**
 * requireAuth: checks the "Authorization: Bearer <token>" header.
 * On success it sets req.user = { id } (a number) and calls next().
 * On any problem it answers 401 with the same short message, without saying why.
 */

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { httpError } = require('./errorMiddleware');

function requireAuth(req, res, next) {
  const match = /^Bearer\s+(\S+)$/.exec(req.headers.authorization || '');
  if (!match) return next(httpError(401, 'Login required'));

  try {
    const payload = jwt.verify(match[1], env.jwt.secret, { algorithms: ['HS256'] });
    const id = Number(payload.sub);
    if (!Number.isInteger(id) || id < 1) throw new Error('token has no valid subject');
    req.user = { id };
    return next();
  } catch (err) {
    return next(httpError(401, 'Invalid or expired token'));
  }
}

module.exports = { requireAuth };
