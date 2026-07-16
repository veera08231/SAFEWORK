const { getDatabase } = require('../database');
const { sendMail } = require('../utils/mailer');

const ALERT_EMAIL = process.env.ALERT_EMAIL || '2k23cse176@kiot.ac.in';

function generateCaseId(db) {
    const last = db.queryOne('SELECT case_id FROM complaints ORDER BY id DESC LIMIT 1');
    let nextNumber = 1001;
    if (last && last.case_id) {
        const numericPart = parseInt(String(last.case_id).replace('#', ''), 10);
        if (!Number.isNaN(numericPart)) {
            nextNumber = numericPart + 1;
        }
    }
    return `#${nextNumber}`;
}

// Helper to map complaint row to frontend format
function mapComplaint(row) {
    return {
        _id: row.id,
        caseId: row.case_id,
        userId: row.user_id,
        incident: row.incident,
        description: row.description,
        file: row.file_path,
        status: row.status,
        createdAt: row.created_at
    };
}

// Create Complaint
exports.createComplaint = (req, res) => {
    try {
        const { userId, incident, description, file, email } = req.body;

        if (!incident || !email) {
            return res.status(400).json({ msg: 'Incident and email are required' });
        }

        const db = getDatabase();

        // Generate Case ID
        const caseId = generateCaseId(db);

        // Save Complaint
        db.execute(
            'INSERT INTO complaints (user_id, case_id, incident, description, file_path) VALUES (?, ?, ?, ?, ?)',
            [userId || 0, caseId, incident, description || '', file || '']
        );

        // Send email notification
        const now = new Date().toLocaleString();
        sendMail({
            to: ALERT_EMAIL,
            subject: '📋 POSH Complaint Submitted - SAFEWORK',
            text: `A new POSH complaint has been submitted.\n\nCase ID: ${caseId}\nIncident: ${incident}\nDescription: ${description || '-'}\nStatus: Pending\nUser Email: ${email}\nTimestamp: ${now}`,
            html: `
                <h3>📋 POSH Complaint Submitted</h3>
                <p>A new POSH complaint has been received.</p>
                <table style="border-collapse:collapse;width:100%;max-width:500px;">
                    <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Case ID</td><td style="padding:8px;border:1px solid #ddd;">${caseId}</td></tr>
                    <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Incident</td><td style="padding:8px;border:1px solid #ddd;">${incident}</td></tr>
                    <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Description</td><td style="padding:8px;border:1px solid #ddd;">${description || '-'}</td></tr>
                    <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Status</td><td style="padding:8px;border:1px solid #ddd;">Pending</td></tr>
                    <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">User Email</td><td style="padding:8px;border:1px solid #ddd;">${email}</td></tr>
                    <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Timestamp</td><td style="padding:8px;border:1px solid #ddd;">${now}</td></tr>
                </table>
            `
        });

        res.status(201).json({ message: 'Complaint submitted', caseId });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Get All Complaints
exports.getAllComplaints = (req, res) => {
    try {
        const db = getDatabase();
        const rows = db.queryAll('SELECT * FROM complaints ORDER BY created_at DESC');
        res.json(rows.map(mapComplaint));
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Get Complaints by User
exports.getUserComplaints = (req, res) => {
    try {
        const { userId } = req.params;
        const db = getDatabase();
        const rows = db.queryAll(
            'SELECT * FROM complaints WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        res.json(rows.map(mapComplaint));
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Get Single Complaint by caseId
exports.getComplaintByCaseId = (req, res) => {
    try {
        const { caseId } = req.params;
        const db = getDatabase();

        const row = db.queryOne(
            'SELECT * FROM complaints WHERE case_id = ?',
            [caseId]
        );

        if (!row) {
            return res.status(404).json({ message: 'Complaint not found' });
        }

        res.json(mapComplaint(row));
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// Update Complaint Status (Admin Optional)
exports.updateComplaintStatus = (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const VALID_STATUSES = ['Pending', 'In Progress', 'Resolved'];
        if (!VALID_STATUSES.includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }

        const db = getDatabase();

        const existing = db.queryOne('SELECT id FROM complaints WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ message: 'Complaint not found' });
        }

        db.execute('UPDATE complaints SET status = ? WHERE id = ?', [status, id]);

        const row = db.queryOne('SELECT * FROM complaints WHERE id = ?', [id]);
        res.json({ message: 'Complaint status updated', complaint: mapComplaint(row) });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};