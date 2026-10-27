'use strict';

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const { checkConnection } = require('./config/db');
const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

app.disable('x-powered-by');
// In development, accept any localhost / 127.0.0.1 port so Vite's port or host never causes a CORS block.
const devLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
app.use(
  cors({
    origin: (origin, cb) =>
      cb(null, !origin || env.corsOrigins.includes(origin) || (!env.isProduction && devLocal.test(origin))),
  })
);
app.use(express.json({ limit: '100kb' }));

// ---- Rate limits (README section 8): login/register and the AI endpoints ----
function limiter(windowMinutes, maxRequests, message) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env.nodeEnv === 'test',
    message: { success: false, error: { message } },
  });
}
const authLimiter = limiter(15, 20, 'Too many attempts. Please try again in a few minutes.');
const aiLimiter = limiter(10, 10, 'Too many AI requests. Please wait a few minutes.');

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.post('/api/analysis/skill-gap', aiLimiter);
app.post('/api/roadmaps', aiLimiter);
app.post('/api/projects/suggest', aiLimiter);

// ---- Health check (no login needed) ----
app.get('/api/health', async (req, res) => {
  try {
    await checkConnection();
    const data = {
      status: 'ok',
      database: 'up',
      uptimeSeconds: Math.round(process.uptime()),
      time: new Date().toISOString(),
    };
    if (!env.isProduction) data.environment = env.nodeEnv; // not shown in production
    res.json({ success: true, data });
  } catch (err) {
    res.status(503).json({ success: false, error: { message: 'Database unavailable' } });
  }
});

// ---- Routers: uncomment each line as soon as that file exists ----
// Member 1:
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/careers', require('./routes/careerRoutes'));
// Member 2: uncomment each line once that file is in your copy of the project:
app.use('/api/skills', require('./routes/skillRoutes'));
app.use('/api/analysis', require('./routes/analysisRoutes'));
app.use('/api/roadmaps', require('./routes/roadmapRoutes'));
// Version 2 features: skill quiz, AI Project Lab, weekly study planner.
app.use('/api/quiz', require('./routes/quizRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/planner', require('./routes/plannerRoutes'));

// Keep these two LAST.
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
