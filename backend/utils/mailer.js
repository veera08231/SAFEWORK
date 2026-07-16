const nodemailer = require('nodemailer');

const user = process.env.EMAIL_USER;
const pass = (process.env.EMAIL_PASS || '').trim();
const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = Number(process.env.SMTP_PORT || 465);
const smtpSecure = String(process.env.SMTP_SECURE || 'true').toLowerCase() === 'true';

if (!user || !pass) {
  console.warn('EMAIL_USER or EMAIL_PASS not set in .env — emails will not be sent.');
}

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user,
    pass
  }
});

/**
 * Send an email
 * options: { to, subject, text, html }
 */
async function sendMail(options) {
  if (!user || !pass) {
    console.warn('Skipping sendMail because EMAIL_USER/EMAIL_PASS are not configured.');
    return;
  }

  if (!smtpHost || !smtpPort) {
    console.warn('Skipping sendMail because SMTP_HOST/SMTP_PORT are not configured.');
    return;
  }

  const mailOptions = {
    from: options.from || `"SAFEWORK" <${user}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    attachments: Array.isArray(options.attachments) ? options.attachments : []
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (err) {
    console.error('Error sending email:', err.message);
    // Don't throw - email failure should not crash the server
    return null;
  }
}

module.exports = { sendMail };