// Uses Resend API (HTTPS port 443) — works on Render free tier
// SMTP (ports 465/587) is blocked by Render free tier

const https = require('https');
const fs = require('fs');

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const ALERT_EMAIL = process.env.ALERT_EMAIL || '2k23cse176@kiot.ac.in';
const FROM_EMAIL = 'SAFEWORK <onboarding@resend.dev>';

console.log('[Mailer] RESEND_API_KEY:', RESEND_API_KEY ? '✅ Set' : '❌ NOT SET — emails will not send!');
console.log('[Mailer] ALERT_EMAIL:', ALERT_EMAIL);

/**
 * Convert file path to base64 for Resend attachment
 * Only attach AUDIO files — video files are too large, they go as links
 */
function fileToBase64(filePath) {
    try {
        if (!filePath || !fs.existsSync(filePath)) return null;
        const buffer = fs.readFileSync(filePath);
        // Only attach if under 5MB (audio only)
        if (buffer.length > 5 * 1024 * 1024) {
            console.warn('[Mailer] File too large to attach (>5MB), skipping attachment:', filePath);
            return null;
        }
        return buffer.toString('base64');
    } catch (err) {
        console.warn('[Mailer] Could not read attachment:', filePath, err.message);
        return null;
    }
}

async function sendMail(options) {
    if (!RESEND_API_KEY) {
        console.error('[Mailer] ❌ RESEND_API_KEY is not set!');
        return null;
    }

    const to = options.to || ALERT_EMAIL;
    const subject = options.subject || 'SAFEWORK Alert';
    const html = options.html || `<p>${options.text || ''}</p>`;

    // Build Resend payload
    const payload = {
        from: FROM_EMAIL,
        to: Array.isArray(to) ? to : [to],
        subject,
        html
    };

    // Handle file attachments
    if (Array.isArray(options.attachments) && options.attachments.length > 0) {
        const attachments = [];
        for (const att of options.attachments) {
            if (!att) continue;
            const base64 = fileToBase64(att.path);
            if (base64) {
                attachments.push({
                    filename: att.filename || 'attachment',
                    content: base64
                });
                console.log('[Mailer] Attaching file:', att.filename);
            }
        }
        if (attachments.length > 0) {
            payload.attachments = attachments;
        }
    }

    const body = JSON.stringify(payload);

    return new Promise((resolve) => {
        const req = https.request({
            hostname: 'api.resend.com',
            path: '/emails',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 202) {
                    console.log('[Mailer] ✅ Email sent via Resend! To:', to);
                    resolve({ messageId: JSON.parse(data).id || 'resend-ok' });
                } else {
                    console.error('[Mailer] ❌ Resend error:', res.statusCode, data.substring(0, 300));
                    resolve(null);
                }
            });
        });

        req.on('error', (err) => {
            console.error('[Mailer] ❌ Resend request failed:', err.message);
            resolve(null);
        });

        req.write(body);
        req.end();
    });
}

module.exports = { sendMail };