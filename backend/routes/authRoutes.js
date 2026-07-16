const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// @route   POST /register
// @desc    Register user
// @access  Public
router.post('/register', authController.register);

// @route   POST /login
// @desc    Login user
// @access  Public
router.post('/login', authController.login);

// @route   GET /users
// @desc    Get all users
// @access  Public
router.get('/users', authController.getAllUsers);

module.exports = router;
