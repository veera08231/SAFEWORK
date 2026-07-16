require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { initDatabase } = require('./database');
const authRoutes = require('./routes/authRoutes');
const sosRoutes = require('./routes/sosRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const { sendMail } = require('./utils/mailer');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files (index.html, styles.css, script.js)
app.use(express.static(path.join(__dirname, '..')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Simple request logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        EMAIL_USER: process.env.EMAIL_USER ? '✅ Set' : '❌ NOT SET',
        EMAIL_PASS: process.env.EMAIL_PASS ? '✅ Set' : '❌ NOT SET',
        ALERT_EMAIL: process.env.ALERT_EMAIL || '2k23cse176@kiot.ac.in (default)'
    });
});

// Test email route
app.get('/test-email', async (req, res) => {
    try {
        const result = await sendMail({
            to: process.env.ALERT_EMAIL || '2k23cse176@kiot.ac.in',
            subject: '✅ SAFEWORK - Test Email',
            text: 'This is a test email from your SAFEWORK backend on Render. If you received this, emails are working!',
            html: '<h2>✅ SAFEWORK Email Test</h2><p>This is a test email from your SAFEWORK backend on Render.</p><p>If you received this, <strong>emails are working correctly!</strong></p>'
        });
        if (result) {
            res.json({ success: true, msg: 'Test email sent! Check your inbox at ' + (process.env.ALERT_EMAIL || '2k23cse176@kiot.ac.in') });
        } else {
            res.json({ success: false, msg: 'Email NOT sent. EMAIL_USER/EMAIL_PASS env vars on Render are likely incorrect. Use the /email-diagnostic endpoint to check.' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Email diagnostic - shows what the env vars look like (without exposing full password)
app.get('/email-diagnostic', (req, res) => {
    const u = process.env.EMAIL_USER || '';
    const p = process.env.EMAIL_PASS || '';
    res.json({
        email_user: u ? `${u.substring(0, 3)}***@${u.includes('@') ? u.split('@')[1] : '?'}` : 'NOT SET',
        email_user_length: u.length,
        email_user_has_at: u.includes('@'),
        email_user_is_gmail: u.includes('gmail.com'),
        email_pass_set: p.length > 0,
        email_pass_length: p.length,
        email_pass_has_spaces: p.includes(' '),
        alert_email: process.env.ALERT_EMAIL || 'NOT SET',
        sendgrid_key_set: !!process.env.SENDGRID_API_KEY,
        instructions: {
            gmail_app_password: 'EMAIL_PASS must be a 16-character App Password. Generate one at: https://myaccount.google.com/apppasswords',
            two_factor_required: 'You MUST have 2FA enabled on your Google account to create App Passwords',
            not_regular_password: 'Your regular Gmail password will NOT work. Only App Passwords are accepted.'
        }
    });
});

// Use Routes
app.use('/', authRoutes);
app.use('/', sosRoutes);
app.use('/', complaintRoutes);

const PORT = process.env.PORT || 5000;

// Initialize SQLite database, then start server
initDatabase().then(() => {
    console.log('========================================');
    console.log('  SAFEWORK Backend Server');
    console.log('  Database: SQLite (No MongoDB needed!)');
    console.log(`  Server running on http://0.0.0.0:${PORT}`);
    console.log('========================================');

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`  Ready! http://localhost:${PORT}`);
        console.log('========================================');
    });
}).catch(err => {
    console.error('Database initialization error:', err);
    process.exit(1);
});