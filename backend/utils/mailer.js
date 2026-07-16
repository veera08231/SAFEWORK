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

// Create Gmail SMTP transporter with multiple port fallbacks
function createTransporter() {
  if (!user || !pass) return null;

  // Try port 587 first (STARTTLS), fallback to 465 (SMTPS)
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    debug: false
  });
}

let transporter = createTransporter();

// Verify SMTP connection on startup (don't block server start)
if (transporter) {
  transporter.verify()
    .then(() => console.log('[Mailer] ✅ Gmail SMTP connection verified — ready to send emails'))
    .catch(err => {
      console.error('[Mailer] ❌ Gmail SMTP verification FAILED:', err.message);
      console.error('[Mailer] ❌ Most likely causes:');
      console.error('[Mailer] ❌ 1. EMAIL_PASS must be a 16-char App Password from https://myaccount.google.com/apppasswords');
      console.error('[Mailer] ❌ 2. 2FA must be enabled on your Google account first');
      console.error('[Mailer] ❌ 3. Check that EMAIL_USER is exactly the Gmail address (e.g. youraccount@gmail.com)');
      console.error('[Mailer] ❌ 4. "Less secure app access" is no longer supported — App Password is required');
    });
}

// Try sending via SendGrid API as a more reliable alternative
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
          if (res.statusCode === 202) {
            console.log('[Mailer] ✅ Sent via SendGrid to:', to);
            resolve(true);
          } else {
            console.error('[Mailer] ❌ SendGrid error:', res.statusCode, body);
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

/**
 * Send an email using available provider (Gmail SMTP -> SendGrid API fallback)
 * options: { to, subject, text, html, attachments }
 */
async function sendMail(options) {
  if (!options || !options.to) {
    console.warn('[Mailer] Skipping sendMail — no recipient specified.');
    return null;
  }

  // Helper to try sending via SMTP transporter
  async function trySmtp() {
    if (!transporter) return null;

    const mailOptions = {
      from: `"SAFEWORK" <${user}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: Array.isArray(options.attachments) ? options.attachments : []
    };

    try {
      console.log('[Mailer] Trying Gmail SMTP ->', options.to, '| Subject:', options.subject);
      const info = await transporter.sendMail(mailOptions);
      console.log('[Mailer] ✅ Gmail SMTP success! MessageId:', info.messageId);
      if (info.accepted && info.accepted.length) console.log('[Mailer] ✅ Accepted:', info.accepted.join(', '));
      return info;
    } catch (err) {
      console.error('[Mailer] ❌ Gmail SMTP failed:', err.message);
      console.error('[Mailer] ❌ Code:', err.code, '| Command:', err.command);
      if (err.responseCode) console.error('[Mailer] ❌ Response:', err.responseCode, err.response);
      return null;
    }
  }

  // Try 1: Gmail SMTP
  let result = await trySmtp();
  if (result) return result;

  // Try 2: SendGrid API (if configured)
  if (SENDGRID_API_KEY) {
    console.log('[Mailer] Trying SendGrid API fallback ->', options.to);
    const sgResult = await sendViaSendGrid(options.to, options.subject, options.text, options.html);
    if (sgResult) return { messageId: 'sendgrid-' + Date.now(), provider: 'sendgrid' };
  }

  // All methods failed
  console.error('[Mailer] ❌ All email delivery methods failed for:', options.to);
  return null;
}

module.exports = { sendMail };