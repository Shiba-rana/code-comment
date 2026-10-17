const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const analyzeRoutes = require('./routes/analyze.routes');

const app = express();

// Required behind reverse proxies like Render
app.set('trust proxy', 1);

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Flexible CORS setup supporting wildcard, multiple comma-separated domains, and Vercel preview URLs
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : '*';

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, server-to-server health checks)
      if (!origin) return callback(null, true);
      if (allowedOrigins === '*' || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Allow Vercel preview deployments if vercel.app is permitted
      if (origin.endsWith('.vercel.app') && allowedOrigins.some((o) => o.includes('vercel.app'))) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: false,
  })
);

// Health check handler - placed before rate limiting so Render health monitor won't be blocked
const healthHandler = (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'CodeComment AI Backend',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
};

app.get('/', healthHandler);
app.get('/health', healthHandler);
app.get('/healthz', healthHandler);
app.get('/api/health', healthHandler);

// Configurable Rate Limiting for API routes
const rateLimitWindowMs = (parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES, 10) || 15) * 60 * 1000;
const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX, 10) || 100;

app.use(
  '/api/',
  rateLimit({
    windowMs: rateLimitWindowMs,
    max: rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: 'Too many requests. Please try again later.',
    },
  })
);

app.use(express.json({ limit: process.env.MAX_BODY_SIZE || '1mb' }));

app.use('/api', analyzeRoutes);
app.use('/', analyzeRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[Global Error]', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal server error.',
  });
});

module.exports = app;

