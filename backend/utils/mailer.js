const nodemailer = require('nodemailer');

const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = (process.env.EMAIL_PASS || '').trim();
const ALERT_EMAIL = process.env.ALERT_EMAIL || '2k23cse176@kiot.ac.in';

console.log('[Mailer] EMAIL_USER:', EMAIL_USER || '❌ NOT SET');
console.log('[Mailer] EMAIL_PASS:', EMAIL_PASS ? '✅ Set' : '❌ NOT SET');
console.log('[Mailer] ALERT_EMAIL:', ALERT_EMAIL);

async function sendMail(options) {
    if (!EMAIL_USER || !EMAIL_PASS) {
        console.error('[Mailer] ❌ EMAIL_USER or EMAIL_PASS is missing in environment variables!');
        return null;
    }

    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS
        }
    });

    const mailOptions = {
        from: `"SAFEWORK Alert" <${EMAIL_USER}>`,
        to: options.to || ALERT_EMAIL,
        subject: options.subject || 'SAFEWORK Alert',
        text: options.text || '',
        html: options.html || options.text || '',
        attachments: Array.isArray(options.attachments) ? options.attachments : []
    };

    try {
        console.log('[Mailer] Sending to:', mailOptions.to, '| Subject:', mailOptions.subject);
        const info = await transporter.sendMail(mailOptions);
        console.log('[Mailer] ✅ Email sent! MessageId:', info.messageId);
        return info;
    } catch (err) {
        console.error('[Mailer] ❌ Failed to send email:', err.message);
        return null;
    }
}

module.exports = { sendMail };