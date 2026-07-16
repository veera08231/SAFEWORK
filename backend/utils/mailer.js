const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');

const user = process.env.EMAIL_USER || '';
const pass = (process.env.EMAIL_PASS || '').trim();
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';

// Configure SendGrid if API key is available
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

console.log('[Mailer] ===== EMAIL CONFIGURATION =====');
console.log('[Mailer] EMAIL_USER:', user ? user : '❌ NOT SET');
console.log('[Mailer] EMAIL_PASS:', pass ? '✅ Set (' + pass.length + ' chars)' : '❌ NOT SET');
console.log('[Mailer] SENDGRID_API_KEY:', SENDGRID_API_KEY ? '✅ Set (' + SENDGRID_API_KEY.substring(0, 8) + '...)' : '❌ NOT SET');
console.log('[Mailer] ALERT_EMAIL:', process.env.ALERT_EMAIL || '2k23cse176@kiot.ac.in (default)');
console.log('[Mailer] ================================');

// SMTP configurations for Gmail (fallback)
const SMTP_CONFIGS = [
  { host: 'smtp.gmail.com', port: 465, secure: true },
  { host: 'smtp.gmail.com', port: 587, secure: false },
  { host: 'smtp.google.com', port: 465, secure: true }
];

// Cache a working transporter
let verifiedTransporter = null;

// Pre-verify SMTP transporter (non-blocking)
async function initTransporter() {
  if (!user || !pass) return;

  for (const cfg of SMTP_CONFIGS) {
    try {
      const t = nodemailer.createTransport({
        ...cfg,
        auth: { user, pass },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 15000
      });
      await t.verify();
      console.log(`[Mailer] ✅ SMTP verified: ${cfg.host}:${cfg.port}`);
      verifiedTransporter = t;
      return;
    } catch (err) {
      console.log(`[Mailer] ❌ SMTP ${cfg.host}:${cfg.port} failed: ${err.message}`);
    }
  }
  console.log('[Mailer] ℹ️  No SMTP available — will use SendGrid or other methods');
}
initTransporter();

/**
 * Send an email using the best available method:
 * 1. SendGrid (HTTPS API - works everywhere)
 * 2. Gmail SMTP (if available)
 */
async function sendMail(options) {
  if (!options || !options.to) {
    console.warn('[Mailer] Skipping sendMail — no recipient specified.');
    return null;
  }

  const { to, subject, text, html, attachments } = options;
  const fromEmail = user || 'noreply@safework.app';
  const fromName = 'SAFEWORK';

  // ===== METHOD 1: SendGrid (primary - works on all hosts) =====
  if (SENDGRID_API_KEY) {
    try {
      const msg = {
        to,
        from: { email: fromEmail, name: fromName },
        subject,
        text: text || '',
        html: html || text || '',
      };

      if (Array.isArray(attachments) && attachments.length > 0) {
        msg.attachments = attachments.map(a => ({
          filename: a.filename || 'attachment',
          content: a.content ? a.content.toString('base64') : undefined,
          path: a.path,
          type: a.contentType,
          disposition: 'attachment'
        })).filter(a => a.content || a.path);
      }

      console.log('[Mailer] Sending via SendGrid ->', to, '| Subject:', subject);
      const result = await sgMail.send(msg);
      console.log('[Mailer] ✅ Sent via SendGrid! Status:', result[0]?.statusCode);
      return { messageId: 'sg-' + Date.now(), provider: 'sendgrid' };
    } catch (err) {
      console.error('[Mailer] ❌ SendGrid failed:', err.message);
      if (err.response) {
        console.error('[Mailer] ❌ SendGrid response body:', err.response.body);
      }
    }
  }

  // ===== METHOD 2: Gmail SMTP (if transporter verified) =====
  if (verifiedTransporter) {
    try {
      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        text: text || '',
        html: html || text || '',
        attachments: Array.isArray(attachments) ? attachments : []
      };

      console.log('[Mailer] Sending via SMTP ->', to, '| Subject:', subject);
      const info = await verifiedTransporter.sendMail(mailOptions);
      console.log('[Mailer] ✅ Sent via SMTP! MessageId:', info.messageId);
      return info;
    } catch (err) {
      console.error('[Mailer] ❌ SMTP send failed:', err.message);
    }
  }

  // ===== METHOD 3: Try all SMTP configs on-the-fly =====
  if (user && pass) {
    for (const cfg of SMTP_CONFIGS) {
      try {
        const t = nodemailer.createTransport({
          ...cfg,
          auth: { user, pass },
          connectionTimeout: 8000,
          greetingTimeout: 8000,
          socketTimeout: 15000
        });
        const mailOptions = {
          from: `"${fromName}" <${fromEmail}>`,
          to,
          subject,
          text: text || '',
          html: html || text || '',
          attachments: Array.isArray(attachments) ? attachments : []
        };
        console.log(`[Mailer] Trying SMTP ${cfg.host}:${cfg.port} -> ${to}`);
        const info = await t.sendMail(mailOptions);
        console.log('[Mailer] ✅ SMTP success on', cfg.host, '| MessageId:', info.messageId);
        verifiedTransporter = t;
        return info;
      } catch (err) {
        console.log(`[Mailer] ❌ SMTP ${cfg.host}:${cfg.port} failed: ${err.message}`);
      }
    }
  }

  console.error('[Mailer] ❌ All delivery methods failed for:', to);
  if (!SENDGRID_API_KEY) {
    console.error('[Mailer] ❌ Tip: Add SENDGRID_API_KEY to Render env vars for reliable delivery');
  }
  return null;
}

module.exports = { sendMail };