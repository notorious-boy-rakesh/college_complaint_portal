const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyAdmin } = require('../middleware/auth');
const PDFDocument = require("pdfkit");

router.get("/complaints", verifyAdmin, (req, res) => {
    db.query("SELECT * FROM complaints ORDER BY id DESC", (err, result) => {
        if (err) return res.status(500).json({ message: "Failed to fetch" });
        res.json(result);
    });
});

router.put("/complaint/:id", verifyAdmin, (req, res) => {
    const { status } = req.body;
    db.query("UPDATE complaints SET status=? WHERE id=?", [status, req.params.id], err => {
        if (err) return res.status(500).json({ message: "Failed to update" });
        res.json({ message: "Status updated" });
    });
});

router.delete("/complaints", verifyAdmin, (req, res) => {
    db.query("DELETE FROM complaints", err => {
        if (err) return res.status(500).json({ message: "Failed to delete all complaints" });
        db.query("ALTER TABLE complaints AUTO_INCREMENT = 1", err2 => {
            if (err2) console.error("Failed to reset auto increment:", err2);
            res.json({ message: "All complaints erased and ID counter reset to 1" });
        });
    });
});

router.put("/complaints/resolve-all", verifyAdmin, (req, res) => {
    db.query("UPDATE complaints SET status='resolved'", err => {
        if (err) return res.status(500).json({ message: "Failed to update complaints" });
        res.json({ message: "All complaints marked as resolved" });
    });
});

router.get("/students", verifyAdmin, (req, res) => {
    db.query("SELECT id, name, regNumber FROM users WHERE role='student'", (err, results) => {
        if (err) return res.status(500).json({ message: "Failed to load students" });
        res.json(results);
    });
});

router.delete("/student/:regNumber", verifyAdmin, (req, res) => {
    const reg = req.params.regNumber;
    db.query("DELETE FROM users WHERE regNumber=? AND role='student'", [reg], err => {
        if (err) return res.status(500).json({ message: "Failed to delete student" });
        res.json({ message: "Student deleted successfully" });
    });
});

router.post("/mail/send", verifyAdmin, (req, res) => {
    const { toRegNumber, subject, body } = req.body;
    if (!toRegNumber || !subject || !body) return res.status(400).json({ message: "All fields required" });
    db.query(
        "INSERT INTO mail_inbox (toRegNumber, subject, body) VALUES (?, ?, ?)",
        [toRegNumber, subject, body],
        err => {
            if (err) return res.status(500).json({ message: "Failed to send email" });
            res.json({ message: "Email sent successfully" });
        }
    );
});

router.get("/complaints/export/pdf", verifyAdmin, (req, res) => {
    db.query("SELECT * FROM complaints", (err, complaints) => {
        if (err) return res.status(500).json({ message: "PDF export failed" });
        const doc = new PDFDocument({ margin: 40 });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=complaints_report.pdf");
        doc.pipe(res);
        doc.fontSize(18).text("College Complaint Portal", { align: "center" }).moveDown(0.5);
        doc.fontSize(14).text("Complaints Report", { align: "center" }).moveDown();
        complaints.forEach((c, i) => {
            doc.fontSize(12).text(`Complaint #${i + 1}`, { underline: true });
            doc.text(`Student Name : ${c.studentName}`);
            doc.text(`Register No  : ${c.regNumber}`);
            doc.text(`Category     : ${c.category}`);
            doc.text(`Title        : ${c.title}`);
            doc.text(`Details      : ${c.details}`);
            doc.text(`Status       : ${c.status}`);
            doc.text(`Date         : ${new Date(c.date).toDateString()}`);
            doc.moveDown();
        });
        doc.end();
    });
});

module.exports = router;
