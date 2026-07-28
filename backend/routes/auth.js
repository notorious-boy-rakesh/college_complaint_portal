const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

router.post("/signup", async (req, res) => {
    try {
        const { name, regNumber, password } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const sql = "INSERT INTO users (name, regNumber, password, role) VALUES (?, ?, ?, 'student')";
        db.query(sql, [name, regNumber, hashedPassword], err => {
            if (err) return res.status(400).json({ message: "User already exists or invalid data" });
            res.json({ message: "Signup successful" });
        });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

router.post("/login", (req, res) => {
    const { regNumber, username, password, isAdmin } = req.body;
    const sql = isAdmin
        ? "SELECT * FROM users WHERE username=? AND role='admin'"
        : "SELECT * FROM users WHERE regNumber=? AND role='student'";
    const value = isAdmin ? username : regNumber;

    db.query(sql, [value], async (err, result) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (!result || result.length === 0) return res.status(401).json({ message: "Invalid credentials" });
        
        try {
            const user = result[0];
            let validPass = false;
            
            if (user.password && (user.password.startsWith("$2b$") || user.password.startsWith("$2a$"))) {
                validPass = await bcrypt.compare(password, user.password);
            } else {
                validPass = (password === user.password);
            }

            if (!validPass) return res.status(401).json({ message: "Invalid credentials" });

            const token = jwt.sign(
                { id: user.id, role: user.role, regNumber: user.regNumber, name: user.name },
                JWT_SECRET,
                { expiresIn: "24h" }
            );

            res.json({
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    regNumber: user.regNumber,
                    username: user.username,
                    role: user.role
                }
            });
        } catch (compareErr) {
            res.status(500).json({ message: "Authentication validation error." });
        }
    });
});

module.exports = router;
