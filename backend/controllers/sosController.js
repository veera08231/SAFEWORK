const { getDatabase } = require('../database');
const { sendMail } = require('../utils/mailer');

const ALERT_EMAIL = process.env.ALERT_EMAIL || '2k23cse176@kiot.ac.in';

// Helper to map SQLite row to frontend format
function mapSOSAlert(row) {
  return {
    _id: row.id,
    userId: row.user_id,
    timestamp: row.created_at,
    status: row.status,
    location: {
      latitude: row.latitude,
      longitude: row.longitude
    },
    isFalseAlarm: row.is_false_alarm === 1,
    cancelledAt: row.cancelled_at,
    audioUrl: row.audio_path,
    videoUrl: row.video_path,
    imageUrl: row.image_path,
    evidenceUrl: row.evidence_path
  };
}

// Helper to build email attachment from uploaded file
function buildAttachment(file, fallbackName) {
    if (!file || !file.path || !file.size) {
        return null;
    }
    return {
        filename: file.originalname || file.filename || fallbackName,
        path: file.path,
        contentType: file.mimetype || undefined
    };
}

// Create SOS Alert
exports.createSOS = (req, res) => {
    try {
        const { userId } = req.body;
        const latitude = Number(req.body.latitude ?? req.body?.location?.latitude);
        const longitude = Number(req.body.longitude ?? req.body?.location?.longitude);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return res.status(400).json({ msg: 'Valid latitude and longitude are required' });
        }

        const db = getDatabase();

        // Get user email
        const user = db.queryOne('SELECT email FROM users WHERE id = ?', [userId]);
        const userEmail = user ? user.email : 'Unknown User';

        // Get uploaded audio/video files from request
        const audioFile = req.files && Array.isArray(req.files.audio) ? req.files.audio[0] : null;
        const videoFile = req.files && Array.isArray(req.files.video) ? req.files.video[0] : null;

        // Insert SOS alert
        const sosId = db.execute(
            'INSERT INTO sos_alerts (user_id, latitude, longitude) VALUES (?, ?, ?)',
            [userId, latitude, longitude]
        );

        // Save evidence paths to database if files were uploaded
        if (audioFile) {
            const audioUrl = `${req.protocol}://${req.get('host')}/uploads/${audioFile.filename}`;
            db.execute('UPDATE sos_alerts SET audio_path = ? WHERE id = ?', [audioUrl, sosId]);
        }
        if (videoFile) {
            const videoUrl = `${req.protocol}://${req.get('host')}/uploads/${videoFile.filename}`;
            db.execute('UPDATE sos_alerts SET video_path = ? WHERE id = ?', [videoUrl, sosId]);
        }

        // Build attachments array
        const attachments = [
            buildAttachment(audioFile, 'sos-audio.webm'),
            buildAttachment(videoFile, 'sos-video.webm')
        ].filter(Boolean);

        // Send email alert with location + audio/video attachments
        const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        const now = new Date().toLocaleString();
        
        sendMail({
            to: ALERT_EMAIL,
            subject: '🚨 Emergency SOS Alert - SAFEWORK',
            text: `EMERGENCY SOS ALERT\n\nUser is facing an emergency!\n\nUser Email: ${userEmail}\nLive Location: ${mapsLink}\nLatitude: ${latitude}\nLongitude: ${longitude}\nTimestamp: ${now}\n\n${audioFile ? 'Audio evidence attached' : ''}\n${videoFile ? 'Video evidence attached' : ''}`,
            html: `
                <h2 style="color:#DC143C;">🚨 EMERGENCY SOS ALERT</h2>
                <p><strong>User is facing an emergency!</strong></p>
                <table style="border-collapse:collapse;width:100%;max-width:500px;">
                    <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">User Email</td><td style="padding:8px;border:1px solid #ddd;">${userEmail}</td></tr>
                    <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Latitude</td><td style="padding:8px;border:1px solid #ddd;">${latitude}</td></tr>
                    <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Longitude</td><td style="padding:8px;border:1px solid #ddd;">${longitude}</td></tr>
                    <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Location</td><td style="padding:8px;border:1px solid #ddd;"><a href="${mapsLink}" target="_blank">Open in Google Maps</a></td></tr>
                    <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Timestamp</td><td style="padding:8px;border:1px solid #ddd;">${now}</td></tr>
                    ${audioFile ? `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Audio Evidence</td><td style="padding:8px;border:1px solid #ddd;">Attached (${(audioFile.size / 1024).toFixed(1)} KB)</td></tr>` : ''}
                    ${videoFile ? `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Video Evidence</td><td style="padding:8px;border:1px solid #ddd;">Attached (${(videoFile.size / 1024 / 1024).toFixed(1)} MB)</td></tr>` : ''}
                </table>
                <p style="margin-top:20px;color:#666;">This is an automated alert from SAFEWORK app.</p>
            `,
            attachments
        });

        res.json({
            msg: 'SOS Sent',
            sosId,
            tracking: {
                enabled: true,
                intervalSeconds: 120,
                startedAt: new Date()
            }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Save SOS live tracking point
exports.addLiveTrackingUpdate = (req, res) => {
    try {
        const { id } = req.params;
        const { location, timestamp } = req.body;

        if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
            return res.status(400).json({ msg: 'Valid location is required' });
        }

        const db = getDatabase();

        const sos = db.queryOne('SELECT id, status FROM sos_alerts WHERE id = ?', [id]);
        if (!sos) {
            return res.status(404).json({ msg: 'SOS alert not found' });
        }
        if (sos.status !== 'active') {
            return res.status(400).json({ msg: 'SOS is not active' });
        }

        db.execute(
            'INSERT INTO live_tracking (sos_id, latitude, longitude) VALUES (?, ?, ?)',
            [id, location.latitude, location.longitude]
        );

        return res.json({ msg: 'Tracking update saved' });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
};

// Save SOS audio evidence
exports.addSOSAudioEvidence = (req, res) => {
    try {
        const { id } = req.params;
        const { mimeType, durationSeconds } = req.body;

        if (!req.file) {
            return res.status(400).json({ msg: 'Audio file is required' });
        }

        const db = getDatabase();
        const sos = db.queryOne('SELECT id, user_id, latitude, longitude FROM sos_alerts WHERE id = ?', [id]);
        if (!sos) {
            return res.status(404).json({ msg: 'SOS alert not found' });
        }

        const audioUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        const parsedDuration = Number(durationSeconds) || 30;

        db.execute(
            'INSERT INTO evidence_audio (sos_id, audio_path, mime_type, duration_seconds) VALUES (?, ?, ?, ?)',
            [id, audioUrl, mimeType || req.file.mimetype || 'audio/webm', parsedDuration]
        );

        db.execute('UPDATE sos_alerts SET audio_path = ? WHERE id = ?', [audioUrl, id]);

        // Send email with audio evidence
        const user = db.queryOne('SELECT email FROM users WHERE id = ?', [sos.user_id]);
        const userEmail = user ? user.email : 'Unknown User';
        const mapsLink = `https://www.google.com/maps?q=${sos.latitude},${sos.longitude}`;
        
        sendMail({
            to: ALERT_EMAIL,
            subject: '🚨 SOS Alert - Audio Evidence Recorded',
            text: `Audio evidence recorded for SOS #${id}\n\nUser Email: ${userEmail}\nLocation: ${mapsLink}\nAudio: ${audioUrl}\nDuration: ${parsedDuration}s`,
            html: `
                <h3>🚨 SOS Alert - Audio Evidence</h3>
                <p><strong>User Email:</strong> ${userEmail}</p>
                <p><strong>Location:</strong> <a href="${mapsLink}">${mapsLink}</a></p>
                <p><strong>Audio Evidence:</strong> <a href="${audioUrl}">Listen</a></p>
                <p><strong>Duration:</strong> ${parsedDuration}s</p>
            `
        });

        return res.json({ msg: 'Audio evidence saved', audioUrl });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
};

// Save SOS video evidence
exports.addSOSVideoEvidence = (req, res) => {
    try {
        const { id } = req.params;
        const { mimeType, durationSeconds } = req.body;

        if (!req.file) {
            return res.status(400).json({ msg: 'Video file is required' });
        }

        const db = getDatabase();
        const sos = db.queryOne('SELECT id, user_id, latitude, longitude FROM sos_alerts WHERE id = ?', [id]);
        if (!sos) {
            return res.status(404).json({ msg: 'SOS alert not found' });
        }

        const videoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        const parsedDuration = Number(durationSeconds) || 15;

        db.execute(
            'INSERT INTO evidence_video (sos_id, video_path, mime_type, duration_seconds) VALUES (?, ?, ?, ?)',
            [id, videoUrl, mimeType || req.file.mimetype || 'video/webm', parsedDuration]
        );

        db.execute('UPDATE sos_alerts SET video_path = ? WHERE id = ?', [videoUrl, id]);

        // Send email with video evidence
        const user = db.queryOne('SELECT email FROM users WHERE id = ?', [sos.user_id]);
        const userEmail = user ? user.email : 'Unknown User';
        const mapsLink = `https://www.google.com/maps?q=${sos.latitude},${sos.longitude}`;
        
        sendMail({
            to: ALERT_EMAIL,
            subject: '🚨 SOS Alert - Video Evidence Recorded',
            text: `Video evidence recorded for SOS #${id}\n\nUser Email: ${userEmail}\nLocation: ${mapsLink}\nVideo: ${videoUrl}\nDuration: ${parsedDuration}s`,
            html: `
                <h3>🚨 SOS Alert - Video Evidence</h3>
                <p><strong>User Email:</strong> ${userEmail}</p>
                <p><strong>Location:</strong> <a href="${mapsLink}">${mapsLink}</a></p>
                <p><strong>Video Evidence:</strong> <a href="${videoUrl}">Watch</a></p>
                <p><strong>Duration:</strong> ${parsedDuration}s</p>
            `
        });

        return res.json({ msg: 'Video evidence saved', videoUrl });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
};

// Save SOS image evidence
exports.addSOSImageEvidence = (req, res) => {
    try {
        const { id } = req.params;
        const { mimeType } = req.body;

        if (!req.file) {
            return res.status(400).json({ msg: 'Image file is required' });
        }

        const db = getDatabase();
        const sos = db.queryOne('SELECT id, user_id, latitude, longitude FROM sos_alerts WHERE id = ?', [id]);
        if (!sos) {
            return res.status(404).json({ msg: 'SOS alert not found' });
        }

        const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

        db.execute(
            'INSERT INTO evidence_images (sos_id, image_path, mime_type) VALUES (?, ?, ?)',
            [id, imageUrl, mimeType || req.file.mimetype || 'image/jpeg']
        );

        db.execute('UPDATE sos_alerts SET image_path = ? WHERE id = ?', [imageUrl, id]);

        // Send email with image evidence
        const user = db.queryOne('SELECT email FROM users WHERE id = ?', [sos.user_id]);
        const userEmail = user ? user.email : 'Unknown User';
        const mapsLink = `https://www.google.com/maps?q=${sos.latitude},${sos.longitude}`;
        
        sendMail({
            to: ALERT_EMAIL,
            subject: '🚨 SOS Alert - Image Evidence Captured',
            text: `Image evidence captured for SOS #${id}\n\nUser Email: ${userEmail}\nLocation: ${mapsLink}\nImage: ${imageUrl}`,
            html: `
                <h3>🚨 SOS Alert - Image Evidence</h3>
                <p><strong>User Email:</strong> ${userEmail}</p>
                <p><strong>Location:</strong> <a href="${mapsLink}">${mapsLink}</a></p>
                <p><strong>Image Evidence:</strong></p>
                <img src="${imageUrl}" style="max-width:100%;max-height:300px;border-radius:8px;" />
            `
        });

        return res.json({ msg: 'Image evidence saved', imageUrl });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
};

// Save combined SOS evidence
exports.addSOSEvidence = (req, res) => {
    try {
        const { id } = req.params;
        const { audioMimeType, videoMimeType, audioDurationSeconds, videoDurationSeconds } = req.body;

        const audioFile = req.files && Array.isArray(req.files.audio) ? req.files.audio[0] : null;
        const videoFile = req.files && Array.isArray(req.files.video) ? req.files.video[0] : null;

        if (!audioFile || !audioFile.size) {
            return res.status(400).json({ msg: 'Valid audio evidence is required' });
        }

        const db = getDatabase();
        const sos = db.queryOne('SELECT id, user_id, latitude, longitude FROM sos_alerts WHERE id = ?', [id]);
        if (!sos) {
            return res.status(404).json({ msg: 'SOS alert not found' });
        }

        const audioUrl = `${req.protocol}://${req.get('host')}/uploads/${audioFile.filename}`;
        const videoUrl = (videoFile && videoFile.size)
            ? `${req.protocol}://${req.get('host')}/uploads/${videoFile.filename}`
            : '';

        const parsedAudioDuration = Number(audioDurationSeconds) || 30;
        const parsedVideoDuration = Number(videoDurationSeconds) || 15;

        db.execute(
            'INSERT INTO evidence_audio (sos_id, audio_path, mime_type, duration_seconds) VALUES (?, ?, ?, ?)',
            [id, audioUrl, audioMimeType || audioFile.mimetype || 'audio/webm', parsedAudioDuration]
        );

        db.execute('UPDATE sos_alerts SET audio_path = ? WHERE id = ?', [audioUrl, id]);

        if (videoUrl) {
            db.execute(
                'INSERT INTO evidence_video (sos_id, video_path, mime_type, duration_seconds) VALUES (?, ?, ?, ?)',
                [id, videoUrl, videoMimeType || videoFile.mimetype || 'video/webm', parsedVideoDuration]
            );
            db.execute('UPDATE sos_alerts SET video_path = ? WHERE id = ?', [videoUrl, id]);
            db.execute('UPDATE sos_alerts SET evidence_path = ? WHERE id = ?', [videoUrl, id]);
        } else {
            db.execute('UPDATE sos_alerts SET evidence_path = ? WHERE id = ?', [audioUrl, id]);
        }

        // Send email with evidence
        const user = db.queryOne('SELECT email FROM users WHERE id = ?', [sos.user_id]);
        const userEmail = user ? user.email : 'Unknown User';
        const mapsLink = `https://www.google.com/maps?q=${sos.latitude},${sos.longitude}`;
        
        sendMail({
            to: ALERT_EMAIL,
            subject: '🚨 SOS Alert - Evidence Captured',
            text: `Evidence captured for SOS #${id}\n\nUser Email: ${userEmail}\nLocation: ${mapsLink}\nAudio: ${audioUrl}${videoUrl ? `\nVideo: ${videoUrl}` : ''}`,
            html: `
                <h3>🚨 SOS Alert - Evidence Captured</h3>
                <p><strong>User Email:</strong> ${userEmail}</p>
                <p><strong>Location:</strong> <a href="${mapsLink}">${mapsLink}</a></p>
                <p><strong>Audio Evidence:</strong> <a href="${audioUrl}">Listen</a></p>
                ${videoUrl ? `<p><strong>Video Evidence:</strong> <a href="${videoUrl}">Watch</a></p>` : ''}
            `
        });

        return res.json({ msg: 'Evidence saved', audioUrl, videoUrl, hasVideo: !!videoUrl });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
};

// Cancel SOS (False Alarm)
exports.cancelSOS = (req, res) => {
    try {
        const { id } = req.params;
        const db = getDatabase();

        const sos = db.queryOne('SELECT id, status, user_id, latitude, longitude FROM sos_alerts WHERE id = ?', [id]);
        if (!sos) {
            return res.status(404).json({ msg: 'SOS alert not found' });
        }
        if (sos.status !== 'active') {
            return res.status(400).json({ msg: 'Only active SOS alerts can be cancelled' });
        }

        db.execute(
            "UPDATE sos_alerts SET status = 'cancelled', is_false_alarm = 1, cancelled_at = CURRENT_TIMESTAMP WHERE id = ?",
            [id]
        );

        // Send cancellation email
        const user = db.queryOne('SELECT email FROM users WHERE id = ?', [sos.user_id]);
        const userEmail = user ? user.email : 'Unknown User';
        
        sendMail({
            to: ALERT_EMAIL,
            subject: 'SAFEWORK - SOS Cancelled (False Alarm)',
            text: `SOS #${id} was cancelled as false alarm.\n\nUser Email: ${userEmail}\nTime: ${new Date().toLocaleString()}`,
            html: `
                <h3>SAFEWORK - SOS Cancelled</h3>
                <p>SOS #${id} was marked as a false alarm.</p>
                <p><strong>User Email:</strong> ${userEmail}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            `
        });

        return res.json({ msg: 'SOS cancelled successfully', status: 'cancelled' });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
};

// Get All SOS Alerts
exports.getAllSOS = (req, res) => {
    try {
        const db = getDatabase();
        const rows = db.queryAll('SELECT * FROM sos_alerts ORDER BY created_at DESC');
        res.json(rows.map(mapSOSAlert));
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Get SOS history (optionally by userId query)
exports.getSOSHistory = (req, res) => {
    try {
        const { userId } = req.query;
        const db = getDatabase();

        let rows;
        if (userId) {
            rows = db.queryAll(
                'SELECT * FROM sos_alerts WHERE user_id = ? ORDER BY created_at DESC',
                [userId]
            );
        } else {
            rows = db.queryAll('SELECT * FROM sos_alerts ORDER BY created_at DESC');
        }

        return res.json(rows.map(mapSOSAlert));
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
};

// Get SOS history by user
exports.getSOSHistoryByUser = (req, res) => {
    try {
        const { userId } = req.params;
        const db = getDatabase();

        const rows = db.queryAll(
            'SELECT * FROM sos_alerts WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        res.json(rows.map(mapSOSAlert));
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};