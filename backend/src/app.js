const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const analyzeRoutes = require('./routes/analyze.routes');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  })
);

app.use(
  '/api/',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: 'Too many requests. Please try again later.',
    },
  })
);

app.use(express.json({ limit: '250kb' }));

app.use('/api', analyzeRoutes);

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'CodeComment AI Backend' });
});

app.use((err, _req, res, _next) => {
  console.error('[Global Error]', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal server error.',
  });
});

module.exports = app;
