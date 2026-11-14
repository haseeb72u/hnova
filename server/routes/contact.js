'use strict';

const express    = require('express');
const nodemailer = require('nodemailer');
const router     = express.Router();

// ── Helpers ──────────────────────────────────────────────────────

/** Minimal but solid email regex (RFC 5322-ish, no unicode domains) */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Escape HTML to prevent injection in the email body */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Allowed values for the project-type field */
const VALID_TYPES = new Set(['workflow', 'ai', 'app', 'unsure']);

/** Build a Nodemailer transporter from env vars */
function createTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error('SMTP credentials are not configured. Check your .env file.');
  }

  return nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   Number(SMTP_PORT) || 587,
    secure: SMTP_SECURE === 'true', // true → port 465, false → STARTTLS on 587
    auth:   { user: SMTP_USER, pass: SMTP_PASS },
  });
}

// ── POST /api/contact ────────────────────────────────────────────
router.post('/contact', async (req, res) => {
  const { name, email, type, message, website } = req.body;

  /* ── Honeypot check ──────────────────────────────────────────
     The `website` field is hidden from real users (opacity:0).
     Bots that fill in every field will trigger this silently
     so they don't know their submission was dropped.          */
  if (typeof website === 'string' && website.trim().length > 0) {
    console.warn('[contact] Honeypot triggered – likely bot submission');
    return res.json({ ok: true }); // fake success to confuse bots
  }

  /* ── Server-side validation ──────────────────────────────── */
  const errors = {};

  const cleanName = (typeof name === 'string') ? name.trim() : '';
  if (cleanName.length < 2 || cleanName.length > 100) {
    errors.name = 'Please enter your name (2–100 characters).';
  }

  const cleanEmail = (typeof email === 'string') ? email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(cleanEmail)) {
    errors.email = 'Please enter a valid email address.';
  }

  const cleanMessage = (typeof message === 'string') ? message.trim() : '';
  if (cleanMessage.length < 10 || cleanMessage.length > 5000) {
    errors.message = 'Please describe your task (10–5000 characters).';
  }

  const cleanType = VALID_TYPES.has(type) ? type : 'unsure';

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({ ok: false, errors });
  }

  /* ── Build email ─────────────────────────────────────────── */
  const typeLabels = {
    workflow: 'Workflow automation',
    ai:       'AI assistant or agent',
    app:      'Custom app or dashboard',
    unsure:   'Not sure yet',
  };

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Workflow audit request</title></head>
<body style="margin:0;padding:32px;font-family:sans-serif;font-size:15px;line-height:1.6;background:#f5f5f5">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;margin:0 auto">
    <tr>
      <td style="background:#000;padding:24px 32px">
        <span style="color:#fff;font-weight:700;font-size:20px">H<span style="color:#2fbf4f">Nova</span></span>
        <span style="color:#8a8f98;font-size:13px;margin-left:16px">New workflow audit request</span>
      </td>
    </tr>
    <tr>
      <td style="padding:32px">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #eee"><strong>Name</strong></td>
            <td style="padding:8px 0;border-bottom:1px solid #eee">${esc(cleanName)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #eee"><strong>Email</strong></td>
            <td style="padding:8px 0;border-bottom:1px solid #eee">
              <a href="mailto:${esc(cleanEmail)}" style="color:#2fbf4f">${esc(cleanEmail)}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #eee"><strong>Project type</strong></td>
            <td style="padding:8px 0;border-bottom:1px solid #eee">${esc(typeLabels[cleanType])}</td>
          </tr>
        </table>
        <p style="margin:24px 0 8px"><strong>Details</strong></p>
        <div style="background:#f9f9f9;border-radius:8px;padding:16px;white-space:pre-wrap;font-size:14px;color:#333">${esc(cleanMessage)}</div>
      </td>
    </tr>
    <tr>
      <td style="background:#f9f9f9;padding:16px 32px;color:#8a8f98;font-size:12px;border-top:1px solid #eee">
        Sent from the contact form at hnova.tech
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textBody = [
    'New workflow audit request – hnova.tech',
    '─'.repeat(40),
    `Name         : ${cleanName}`,
    `Email        : ${cleanEmail}`,
    `Project type : ${typeLabels[cleanType]}`,
    '',
    'Details:',
    cleanMessage,
  ].join('\n');

  /* ── Send ────────────────────────────────────────────────── */
  try {
    const transporter = createTransporter();

    await transporter.sendMail({
      from:    process.env.MAIL_FROM || `"HNova Website" <${process.env.SMTP_USER}>`,
      to:      process.env.MAIL_TO   || 'hello@hnova.tech',
      replyTo: `"${cleanName}" <${cleanEmail}>`,
      subject: `Workflow audit request from ${cleanName}`,
      text:    textBody,
      html:    htmlBody,
    });

    console.log(`[contact] Email sent  → ${cleanEmail} (${cleanName})`);
    return res.json({ ok: true });

  } catch (err) {
    console.error('[contact] Nodemailer error:', err.message);
    return res.status(500).json({
      ok: false,
      error: 'We couldn\'t send your message right now. Please email us directly at hello@hnova.tech',
    });
  }
});

module.exports = router;
