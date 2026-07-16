require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { initDatabase } = require('./database');
const authRoutes = require('./routes/authRoutes');
const sosRoutes = require('./routes/sosRoutes');
const complaintRoutes = require('./routes/complaintRoutes');

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