'use strict';

/**
 * MySQL connection pool (mysql2/promise).
 *
 * Usage everywhere else:
 *   const { pool } = require('../config/db');
 *   const [rows] = await pool.query('SELECT * FROM careers WHERE id = ?', [careerId]);
 *
 * Always pass user input through the `?` placeholders, never by joining strings into the SQL.
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('./env');

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true, // DECIMAL columns (for example readiness_score) come back as numbers
});

/** Resolves when the database answers; rejects with the MySQL error otherwise. */
async function checkConnection() {
  const [rows] = await pool.query('SELECT 1 AS ok');
  return rows[0].ok === 1;
}

/**
 * Applies backend/database/migration_002_features.sql on startup. Every statement is
 * CREATE TABLE IF NOT EXISTS, so this is a no-op on up-to-date databases and creates
 * quiz_attempts, projects and study_sessions on databases made from the older schema.
 */
async function ensureSchema() {
  const file = path.join(__dirname, '..', 'database', 'migration_002_features.sql');
  const sql = fs.readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
  const statements = sql.split(';').map((s) => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    await pool.query(stmt);
  }
}

module.exports = { pool, checkConnection, ensureSchema };
