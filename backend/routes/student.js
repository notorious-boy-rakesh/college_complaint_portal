const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

router.post("/complaint", verifyToken, (req, res) => {
    const { category, title, details } = req.body;
    const studentName = req.user.name;
    const regNumber = req.user.regNumber;
    const sql = `INSERT INTO complaints (studentName, regNumber, category, title, details) VALUES (?, ?, ?, ?, ?)`;
    db.query(sql, [studentName, regNumber, category, title, details], err => {
        if (err) return res.status(500).json({ message: "Failed to submit complaint" });
        res.json({ message: "Complaint submitted successfully" });
    });
});

router.get("/complaints/my", verifyToken, (req, res) => {
    db.query(
        "SELECT * FROM complaints WHERE regNumber=? ORDER BY id DESC",
        [req.user.regNumber],
        (err, result) => {
            if(err) return res.status(500).json({message: "Failed to fetch"});
            res.json(result);
        }
    );
});

// Mail inbox routes specific to the student
router.get("/mail/inbox", verifyToken, (req, res) => {
    db.query(
        "SELECT * FROM mail_inbox WHERE toRegNumber=? ORDER BY sentAt DESC",
        [req.user.regNumber],
        (err, results) => {
            if (err) return res.status(500).json({ message: "Failed to fetch inbox" });
            res.json(results);
        }
    );
});

router.get("/mail/unread-count", verifyToken, (req, res) => {
    db.query(
        "SELECT COUNT(*) as count FROM mail_inbox WHERE toRegNumber=? AND isRead=0",
        [req.user.regNumber],
        (err, results) => {
            if (err) return res.status(500).json({ count: 0 });
            res.json({ count: results[0].count });
        }
    );
});

router.put("/mail/mark-read", verifyToken, (req, res) => {
    db.query(
        "UPDATE mail_inbox SET isRead=1 WHERE toRegNumber=?",
        [req.user.regNumber],
        err => {
            if (err) return res.status(500).json({ message: "Failed to mark as read" });
            res.json({ message: "All marked as read" });
        }
    );
});

module.exports = router;
