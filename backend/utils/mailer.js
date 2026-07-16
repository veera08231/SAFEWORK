const nodemailer = require('nodemailer');

const user = process.env.EMAIL_USER;
const pass = (process.env.EMAIL_PASS || '').trim();

console.log('[Mailer] EMAIL_USER:', user ? user : '❌ NOT SET');
console.log('[Mailer] EMAIL_PASS:', pass ? '✅ Set (' + pass.length + ' chars)' : '❌ NOT SET');
console.log('[Mailer] ALERT_EMAIL:', process.env.ALERT_EMAIL || '2k23cse176@kiot.ac.in (default)');

if (!user || !pass) {
  console.warn('[Mailer] WARNING: EMAIL_USER or EMAIL_PASS not set — emails will not be sent.');
}

// Create transporter with timeouts and better error handling
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user,
    pass
  },
  connectionTimeout: 15000,  // 15s
  greetingTimeout: 15000,
  socketTimeout: 30000
});

// Verify transporter on startup
transporter.verify()
  .then(() => console.log('[Mailer] ✅ SMTP connection verified — ready to send emails'))
  .catch(err => {
    console.error('[Mailer] ❌ SMTP verification FAILED:', err.message);
    console.error('[Mailer] ❌ Full error:', err);
    console.error('[Mailer] ❌ If using Gmail, make sure:');
    console.error('[Mailer] ❌ 1. EMAIL_PASS is a 16-character App Password (not your regular password)');
    console.error('[Mailer] ❌ 2. Generate one at: https://myaccount.google.com/apppasswords');
    console.error('[Mailer] ❌ 3. 2FA must be enabled on your Google account first');
  });

/**
 * Send an email
 * options: { to, subject, text, html, attachments }
 */
async function sendMail(options) {
  if (!user || !pass) {
    console.warn('[Mailer] Skipping sendMail — EMAIL_USER/EMAIL_PASS not configured.');
    return null;
  }

  const mailOptions = {
    from: `"SAFEWORK" <${user}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    attachments: Array.isArray(options.attachments) ? options.attachments : []
  };

  try {
    console.log('[Mailer] Sending email to:', options.to, '| Subject:', options.subject);
    const info = await transporter.sendMail(mailOptions);
    console.log('[Mailer] ✅ Email sent! MessageId:', info.messageId);
    if (info.accepted && info.accepted.length) console.log('[Mailer] ✅ Accepted by:', info.accepted.join(', '));
    if (info.rejected && info.rejected.length) console.log('[Mailer] ❌ Rejected:', info.rejected.join(', '));
    return info;
  } catch (err) {
    console.error('[Mailer] ❌ FAILED to send email:', err.message);
    console.error('[Mailer] ❌ Error code:', err.code);
    console.error('[Mailer] ❌ Error command:', err.command);
    if (err.response) console.error('[Mailer] ❌ SMTP response:', err.response);
    if (err.responseCode) console.error('[Mailer] ❌ Response code:', err.responseCode);
    console.error('[Mailer] ❌ Full error:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
    return null;
  }
}

module.exports = { sendMail };