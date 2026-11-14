'use strict';

const path   = require('path');
const fs     = require('fs');

// Load .env from server/ or parent
if (fs.existsSync(path.join(__dirname, '.env'))) {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
} else {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
}

const express       = require('express');
const cors          = require('cors');
const rateLimit     = require('express-rate-limit');
const contactRouter = require('./routes/contact');

const app  = express();
const PORT = process.env.PORT || 3000;

// Determine public directory (self-contained public/ or parent directory)
const publicDir = fs.existsSync(path.join(__dirname, 'public'))
  ? path.join(__dirname, 'public')
  : path.join(__dirname, '..');

// ── Trust proxy ──
app.set('trust proxy', 1);

// ── CORS ──────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: function (origin, cb) {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) return cb(null, true);
    cb(null, true); // Allow same-origin and flexible access
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

// ── Static assets ─────────────────────────────────────────────────
app.use(express.static(publicDir));

// ── Body parsing ──────────────────────────────────────────────────
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: true, limit: '20kb' }));

// ── Rate limiter ──────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      ok: false,
      error: 'Too many submissions. Please wait 15 minutes and try again.',
    });
  },
});

app.use('/api/contact', limiter);
app.use('/api', contactRouter);

// ── Health check ──────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true }));

// ── Frontend routes ───────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/privacy-policy', (_req, res) => {
  res.sendFile(path.join(publicDir, 'privacy-policy.html'));
});

app.get('/terms', (_req, res) => {
  res.sendFile(path.join(publicDir, 'terms.html'));
});

// Fallback for HTML or missing files
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const directPath = path.join(publicDir, req.path);
  if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
    return res.sendFile(directPath);
  }
  const htmlPath = path.join(publicDir, `${req.path}.html`);
  if (fs.existsSync(htmlPath)) {
    return res.sendFile(htmlPath);
  }
  res.sendFile(path.join(publicDir, 'index.html'));
});

// ── Global error handler ──────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[server]', err.message || err);
  const status = err.status || 500;
  res.status(status).json({ ok: false, error: err.message || 'Server error' });
});

// ── Start ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`HNova server running on port ${PORT}`);
  console.log(`Serving static files from: ${publicDir}`);
});
