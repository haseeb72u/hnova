'use strict';

const path    = require('path');
// Load .env from the project root (one level above server/)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express     = require('express');
const cors        = require('cors');
const rateLimit   = require('express-rate-limit');
const contactRouter = require('./routes/contact');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Trust proxy (Heroku / Railway / Render add X-Forwarded-For) ──
app.set('trust proxy', 1);

// ── CORS ──────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: function (origin, cb) {
    // Allow server-to-server requests (no Origin header) and listed origins
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(Object.assign(new Error('Not allowed by CORS'), { status: 403 }));
  },
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

// ── Body parsing (hard cap at 20 KB to prevent abuse) ─────────────
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: true, limit: '20kb' }));

// ── Rate limiter: 5 submissions per IP per 15 minutes ────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      ok: false,
      error: 'Too many submissions from this IP. Please wait 15 minutes and try again.',
    });
  },
});

app.use('/api/contact', limiter);

// ── Routes ───────────────────────────────────────────────────────
app.use('/api', contactRouter);

// ── Health check (for uptime monitors) ───────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true }));

// ── 404 ──────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ ok: false, error: 'Not found' }));

// ── Global error handler ─────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[server]', err.message || err);
  const status = err.status || 500;
  res.status(status).json({ ok: false, error: err.message || 'Server error' });
});

// ── Start ────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`HNova contact server → http://localhost:${PORT}`);
  console.log(`  MAIL_TO   : ${process.env.MAIL_TO   || '(not set)'}`);
  console.log(`  SMTP_HOST : ${process.env.SMTP_HOST || '(not set)'}`);
});
