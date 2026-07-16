const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const sosController = require('../controllers/sosController');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || '.webm') || '.webm';
        const prefix = file.fieldname === 'video'
            ? 'sos-video'
            : file.fieldname === 'evidence'
                ? 'sos-evidence'
            : file.fieldname === 'image'
                ? 'sos-image'
                : 'sos-audio';
        cb(null, `${prefix}-${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 25 * 1024 * 1024 // 25MB per file (audio/video can be large)
    }
});


router.post(
    '/sos',
    upload.fields([
        { name: 'audio', maxCount: 1 },
        { name: 'video', maxCount: 1 }
    ]),
    sosController.createSOS
);

router.post('/sos/:id/tracking', sosController.addLiveTrackingUpdate);


router.post('/sos/:id/audio', upload.single('audio'), sosController.addSOSAudioEvidence);


router.post('/sos/:id/video', upload.single('video'), sosController.addSOSVideoEvidence);


router.post('/sos/:id/image', upload.single('image'), sosController.addSOSImageEvidence);


router.post(
    '/sos/:id/evidence',
    upload.fields([
        { name: 'audio', maxCount: 1 },
        { name: 'video', maxCount: 1 }
    ]),
    sosController.addSOSEvidence
);

// @route   POST /sos/cancel/:id
// @desc    Cancel active SOS as false alarm
// @access  Private (User ID required)
router.post('/sos/cancel/:id', sosController.cancelSOS);

// @route   GET /sos
// @desc    Get all SOS alerts
// @access  Private (Admin/User)
router.get('/sos', sosController.getAllSOS);


router.get('/sos/history', sosController.getSOSHistory);

router.get('/sos/history/:userId', sosController.getSOSHistoryByUser);

module.exports = router;
