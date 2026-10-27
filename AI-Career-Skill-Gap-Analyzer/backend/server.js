'use strict';

// Load and validate the environment first so a bad .env gives a clear message.
let env;
try {
  env = require('./config/env');
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const app = require('./app');
const { pool, checkConnection, ensureSchema } = require('./config/db');

let server;

function shutdown(signal) {
  console.log(`${signal} received, shutting down...`);

  // If closing takes too long, say so and force the exit.
  const timer = setTimeout(() => {
    console.error('Shutdown took longer than 10 seconds; forcing exit.');
    process.exit(1);
  }, 10000);
  timer.unref();

  const finish = async () => {
    await pool.end().catch(() => {});
    process.exit(0);
  };

  if (!server) return finish();
  server.close(finish);
  if (server.closeIdleConnections) server.closeIdleConnections();
}

async function start() {
  try {
    await checkConnection();
    console.log('Database connection OK');
  } catch (err) {
    console.error('Database connection failed:', err.message);
    console.error('Check the DB_* values in backend/.env and that the database exists.');
    process.exit(1);
  }

  try {
    await ensureSchema();
    console.log('Database schema up to date');
  } catch (err) {
    console.error('Could not apply database migration:', err.message);
    process.exit(1);
  }

  server = app.listen(env.port, () => {
    console.log(`API running on http://localhost:${env.port} (${env.nodeEnv})`);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Route errors are handled by errorMiddleware. This catches anything else:
// log it loudly while developing, and stop cleanly in production so it can be restarted.
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
  if (env.isProduction) shutdown('unhandledRejection');
});

start();
