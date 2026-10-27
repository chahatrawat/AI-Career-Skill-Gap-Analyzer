'use strict';

/**
 * Password hashing with bcryptjs (same hash format as bcrypt, no native build needed).
 * Plain passwords are never stored or logged.
 *
 * bcrypt only reads the first 72 bytes of a password, so the request validator
 * should reject passwords longer than that.
 */

const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

function hashPassword(plain) {
  return bcrypt.hash(String(plain), SALT_ROUNDS);
}

function comparePassword(plain, hash) {
  return bcrypt.compare(String(plain), hash);
}

module.exports = { hashPassword, comparePassword };
