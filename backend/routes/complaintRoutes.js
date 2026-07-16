const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');

// @route   POST /complaint
// @desc    Submit POST complaint
// @access  Private (User ID required)
router.post('/complaint', complaintController.createComplaint);

// @route   GET /complaint/:caseId
// @desc    Get single complaint details by caseId
// @access  Private (User)
router.get('/complaint/:caseId', complaintController.getComplaintByCaseId);

// @route   PATCH /complaint/:id
// @desc    Update complaint status (admin optional)
// @access  Public
router.patch('/complaint/:id', complaintController.updateComplaintStatus);

// @route   GET /complaints
// @desc    Get all complaints
// @access  Private (Admin/User)
router.get('/complaints', complaintController.getAllComplaints);

// @route   GET /complaints/:userId
// @desc    Get complaints for a specific user
// @access  Private (User)
router.get('/complaints/:userId', complaintController.getUserComplaints);

module.exports = router;
