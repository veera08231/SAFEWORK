const nodemailer = require('nodemailer');

const user = process.env.EMAIL_USER;
const pass = (process.env.EMAIL_PASS || '').trim();

console.log('[Mailer] EMAIL_USER:', user ? user : '❌ NOT SET');
console.log('[Mailer] EMAIL_PASS:', pass ? '✅ Set (' + pass.length + ' chars)' : '❌ NOT SET');

if (!user || !pass) {
  console.warn('[Mailer] WARNING: EMAIL_USER or EMAIL_PASS not set — emails will not be sent.');
}

// Use port 587 (STARTTLS) — Render blocks port 465 (SMTPS)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user,
    pass
  }
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
    return info;
  } catch (err) {
    console.error('[Mailer] ❌ FAILED:', err.message);
    return null;
  }
}

module.exports = { sendMail };