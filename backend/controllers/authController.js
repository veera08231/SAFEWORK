const { getDatabase } = require('../database');

// Register User
exports.register = (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ msg: 'All fields are required' });
        }

        const db = getDatabase();

        // Check if user exists
        const existing = db.queryOne('SELECT id FROM users WHERE email = ?', [email]);
        if (existing) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // Insert user - execute now returns the last insert ID
        const userId = db.execute(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, password]
        );

        res.status(201).json({
            msg: 'User registered successfully',
            userId,
            name
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Login User
exports.login = (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ msg: 'All fields are required' });
        }

        const db = getDatabase();

        // Find user by email
        const user = db.queryOne(
            'SELECT id, name, email, password FROM users WHERE email = ?',
            [email]
        );

        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        // Plain text password check (same as original hackathon style)
        if (password !== user.password) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        res.json({
            msg: 'Login Successful',
            userId: user.id,
            name: user.name,
            email: user.email
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Get All Users
exports.getAllUsers = (req, res) => {
    try {
        const db = getDatabase();
        const users = db.queryAll(
            'SELECT id, name, email, created_at FROM users ORDER BY name ASC'
        );
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};