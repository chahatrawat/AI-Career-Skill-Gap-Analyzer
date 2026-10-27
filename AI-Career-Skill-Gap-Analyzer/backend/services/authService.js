'use strict';

/**
 * Accounts, login and the user's profile.
 *
 * Contract used by other files:
 *   getProfile(userId) -> { educationLevel, experienceLevel, weeklyStudyHours,
 *                           learningFormat, targetCareerId, targetCareer }
 */

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { pool } = require('../config/db');
const { httpError } = require('../middleware/errorMiddleware');
const { hashPassword, comparePassword } = require('../utils/password');

const toIso = (value) => (value instanceof Date ? value.toISOString() : value);
const normalizeEmail = (email) => String(email).trim().toLowerCase();

// profile field (API name) -> column. Only these names ever reach the SQL text.
const PROFILE_COLUMNS = {
  educationLevel: 'education_level',
  experienceLevel: 'experience_level',
  weeklyStudyHours: 'weekly_study_hours',
  learningFormat: 'learning_format',
  targetCareerId: 'target_career_id',
};
const CANNOT_BE_CLEARED = ['weeklyStudyHours', 'learningFormat'];

function signToken(userId) {
  return jwt.sign({}, env.jwt.secret, {
    algorithm: 'HS256',
    subject: String(userId),
    expiresIn: env.jwt.expiresIn,
  });
}

// Used so a login for an unknown email takes about as long as a wrong password.
let dummyHash;
async function getDummyHash() {
  if (!dummyHash) dummyHash = await hashPassword('not-a-real-password');
  return dummyHash;
}

/** Creates the account and its empty profile, then logs the user in. */
async function register({ name, email, password }) {
  const cleanName = String(name).trim();
  const cleanEmail = normalizeEmail(email);
  const passwordHash = await hashPassword(password);

  const connection = await pool.getConnection();
  let userId;
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [cleanName, cleanEmail, passwordHash]
    );
    userId = Number(result.insertId);
    await connection.query('INSERT INTO user_profiles (user_id) VALUES (?)', [userId]);
    await connection.commit();
  } catch (err) {
    try {
      await connection.rollback();
    } catch (_) {
      // the original error is the one worth reporting
    }
    if (err && err.code === 'ER_DUP_ENTRY') {
      throw httpError(409, 'An account with this email already exists');
    }
    throw err;
  } finally {
    connection.release();
  }

  return { token: signToken(userId), user: { id: userId, name: cleanName, email: cleanEmail } };
}

/** Same error for an unknown email and a wrong password. */
async function login({ email, password }) {
  const [rows] = await pool.query(
    'SELECT id, name, email, password_hash FROM users WHERE email = ?',
    [normalizeEmail(email)]
  );
  const user = rows[0];
  const matches = await comparePassword(password, user ? user.password_hash : await getDummyHash());
  if (!user || !matches) throw httpError(401, 'Invalid email or password');

  const id = Number(user.id);
  return { token: signToken(id), user: { id, name: user.name, email: user.email } };
}

/** The user's profile; defaults are returned if the row is missing. */
async function getProfile(userId) {
  const [rows] = await pool.query(
    `SELECT p.education_level, p.experience_level, p.weekly_study_hours, p.learning_format,
            p.target_career_id, c.name AS target_career_name
       FROM user_profiles p
       LEFT JOIN careers c ON c.id = p.target_career_id
      WHERE p.user_id = ?`,
    [userId]
  );
  const row = rows[0];
  if (!row) {
    return {
      educationLevel: null,
      experienceLevel: null,
      weeklyStudyHours: 5,
      learningFormat: 'mixed',
      targetCareerId: null,
      targetCareer: null,
    };
  }
  const targetCareerId = row.target_career_id === null ? null : Number(row.target_career_id);
  return {
    educationLevel: row.education_level,
    experienceLevel: row.experience_level,
    weeklyStudyHours: Number(row.weekly_study_hours),
    learningFormat: row.learning_format,
    targetCareerId,
    targetCareer: targetCareerId === null ? null : { id: targetCareerId, name: row.target_career_name },
  };
}

/** The logged-in user with their profile. 401 if the account no longer exists. */
async function getMe(userId) {
  const [rows] = await pool.query('SELECT id, name, email, created_at FROM users WHERE id = ?', [userId]);
  if (rows.length === 0) throw httpError(401, 'Account not found');
  const user = rows[0];
  return {
    id: Number(user.id),
    name: user.name,
    email: user.email,
    createdAt: toIso(user.created_at),
    profile: await getProfile(userId),
  };
}

/**
 * Updates the name and/or profile fields that were sent.
 * undefined = leave as is; null = clear (only for fields that may be empty).
 */
async function updateProfile(userId, input) {
  const sets = [];
  const values = [];
  for (const [field, column] of Object.entries(PROFILE_COLUMNS)) {
    if (input[field] === undefined) continue;
    if (input[field] === null && CANNOT_BE_CLEARED.includes(field)) {
      throw httpError(400, `${field} cannot be cleared`);
    }
    sets.push(`${column} = ?`);
    values.push(input[field]);
  }

  const name = input.name === undefined ? undefined : String(input.name).trim();
  if (name === '') throw httpError(400, 'name cannot be empty');

  if (input.targetCareerId !== undefined && input.targetCareerId !== null) {
    const [found] = await pool.query('SELECT id FROM careers WHERE id = ?', [input.targetCareerId]);
    if (found.length === 0) throw httpError(400, 'Unknown career');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    if (name !== undefined) {
      await connection.query('UPDATE users SET name = ? WHERE id = ?', [name, userId]);
    }
    if (sets.length > 0) {
      await connection.query('INSERT IGNORE INTO user_profiles (user_id) VALUES (?)', [userId]);
      await connection.query(`UPDATE user_profiles SET ${sets.join(', ')} WHERE user_id = ?`, [
        ...values,
        userId,
      ]);
    }
    await connection.commit();
  } catch (err) {
    try {
      await connection.rollback();
    } catch (_) {
      // the original error is the one worth reporting
    }
    throw err;
  } finally {
    connection.release();
  }

  return getMe(userId);
}

module.exports = { register, login, getMe, getProfile, updateProfile, signToken };
