const nodemailer = require('nodemailer');

const user = process.env.EMAIL_USER || '';
const pass = (process.env.EMAIL_PASS || '').trim();
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';

console.log('[Mailer] ===== EMAIL CONFIGURATION =====');
console.log('[Mailer] EMAIL_USER:', user ? user : '❌ NOT SET');
console.log('[Mailer] EMAIL_PASS:', pass ? '✅ Set (' + pass.length + ' chars)' : '❌ NOT SET');
console.log('[Mailer] SENDGRID_API_KEY:', SENDGRID_API_KEY ? '✅ Set (' + SENDGRID_API_KEY.substring(0, 8) + '...)' : '❌ NOT SET');
console.log('[Mailer] ALERT_EMAIL:', process.env.ALERT_EMAIL || '2k23cse176@kiot.ac.in (default)');
console.log('[Mailer] ================================');

// Try multiple SMTP configurations in sequence
const SMTP_CONFIGS = [
  // Config 1: Port 465 with SSL (SMTPS) — often works better on cloud hosts
  {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000
  },
  // Config 2: Port 587 with STARTTLS (standard)
  {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000
  },
  // Config 3: Try Google's alternative SMTP address
  {
    host: 'smtp.google.com',
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000
  }
];

let verifiedTransporter = null;
let transporterVerified = false;

// Pre-verify the best working transporter
async function initTransporter() {
  if (!user || !pass) {
    console.log('[Mailer] No credentials, skipping transporter init');
    return;
  }

  for (const cfg of SMTP_CONFIGS) {
    try {
      console.log(`[Mailer] Testing SMTP ${cfg.host}:${cfg.port} (secure:${cfg.secure})...`);
      const t = nodemailer.createTransport(cfg);
      await t.verify();
      console.log(`[Mailer] ✅ SMTP verified: ${cfg.host}:${cfg.port}`);
      verifiedTransporter = t;
      transporterVerified = true;
      return;
    } catch (err) {
      console.log(`[Mailer] ❌ SMTP ${cfg.host}:${cfg.port} failed: ${err.message}`);
    }
  }
  console.log('[Mailer] ❌ All SMTP configurations failed. Emails will not send via SMTP.');
}

// Initialize on startup (don't block)
initTransporter();

// Send via SendGrid HTTPS API (works on any host since it uses port 443)
async function sendViaSendGrid(to, subject, text, html) {
  if (!SENDGRID_API_KEY) return false;

  try {
    const https = require('https');

    const data = JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: user || 'noreply@safework.app', name: 'SAFEWORK' },
      subject: subject,
      content: [
        { type: 'text/plain', value: text || '' },
        { type: 'text/html', value: html || text || '' }
      ]
    });

    const options = {
      hostname: 'api.sendgrid.com',
      path: '/v3/mail/send',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode === 202 || res.statusCode === 200) {
            console.log('[Mailer] ✅ Sent via SendGrid to:', to);
            resolve(true);
          } else {
            console.error('[Mailer] ❌ SendGrid error:', res.statusCode, body.substring(0, 200));
            resolve(false);
          }
        });
      });

      req.on('error', (err) => {
        console.error('[Mailer] ❌ SendGrid network error:', err.message);
        resolve(false);
      });

      req.write(data);
      req.end();
    });
  } catch (err) {
    console.error('[Mailer] ❌ SendGrid exception:', err.message);
    return false;
  }
}

// Send via Gmail HTTPS API (no SMTP needed, uses REST API)
async function sendViaGmailAPI(to, subject, text, html) {
  if (!user || !pass) return false;

  try {
    const https = require('https');

    // Use SendGrid-compatible format via Google Workspace if available
    // Fallback: use a simple HTTPS-based email API
    const postData = JSON.stringify({
      to,
      subject,
      text,
      html,
      from: user
    });

    const options = {
      hostname: 'mail-api.googleapis.com',
      path: '/gmail/v1/users/me/messages/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          // Gmail API requires OAuth2, so this will likely fail without proper setup
          resolve(false);
        });
      });
      req.on('error', () => resolve(false));
      req.write(postData);
      req.end();
    });
  } catch {
    return false;
  }
}

/**
 * Send an email using available provider
 */
async function sendMail(options) {
  if (!options || !options.to) {
    console.warn('[Mailer] Skipping sendMail — no recipient specified.');
    return null;
  }

  // Try 1: Verified SMTP transporter (if available)
  if (verifiedTransporter) {
    try {
      const mailOptions = {
        from: `"SAFEWORK" <${user}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: Array.isArray(options.attachments) ? options.attachments : []
      };

      console.log('[Mailer] Sending via SMTP ->', options.to, '| Subject:', options.subject);
      const info = await verifiedTransporter.sendMail(mailOptions);
      console.log('[Mailer] ✅ Email sent! MessageId:', info.messageId);
      if (info.accepted?.length) console.log('[Mailer] ✅ Accepted:', info.accepted.join(', '));
      return info;
    } catch (err) {
      console.error('[Mailer] ❌ SMTP send failed:', err.message);
    }
  }

  // Try 2: If no transporter verified yet, try all SMTP configs on-the-fly
  if (user && pass) {
    for (const cfg of SMTP_CONFIGS) {
      try {
        const t = nodemailer.createTransport(cfg);
        const mailOptions = {
          from: `"SAFEWORK" <${user}>`,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
          attachments: Array.isArray(options.attachments) ? options.attachments : []
        };
        console.log(`[Mailer] Trying SMTP ${cfg.host}:${cfg.port} -> ${options.to}`);
        const info = await t.sendMail(mailOptions);
        console.log('[Mailer] ✅ SMTP success on', cfg.host, '| MessageId:', info.messageId);
        verifiedTransporter = t; // cache for next time
        return info;
      } catch (err) {
        console.log(`[Mailer] ❌ SMTP ${cfg.host}:${cfg.port} failed: ${err.message}`);
      }
    }
  }

  // Try 3: SendGrid API
  if (SENDGRID_API_KEY) {
    console.log('[Mailer] Trying SendGrid API ->', options.to);
    const sgResult = await sendViaSendGrid(options.to, options.subject, options.text, options.html);
    if (sgResult) return { messageId: 'sendgrid-' + Date.now(), provider: 'sendgrid' };
  }

  console.error('[Mailer] ❌ All email delivery methods failed for:', options.to);
  return null;
}

// Also export the init function for retrying
module.exports = { sendMail, initTransporter };