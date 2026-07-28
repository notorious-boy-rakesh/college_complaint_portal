require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./db");

const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/student");
const adminRoutes = require("./routes/admin");
const aiRoutes = require("./routes/ai");

const app = express();
app.use(cors());
app.use(express.json());

// Auto-create mail_inbox table if it doesn't exist
db.query(`
  CREATE TABLE IF NOT EXISTS mail_inbox (
    id INT AUTO_INCREMENT PRIMARY KEY,
    toRegNumber VARCHAR(12) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    sentAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    isRead TINYINT(1) DEFAULT 0
  )
`, err => {
  if (err) console.error("Failed to create mail_inbox table:", err.message);
  else console.log("mail_inbox table ready.");
});

// Routes
app.use("/", authRoutes);
app.use("/", studentRoutes);
app.use("/admin", adminRoutes);
app.use("/api/ai", aiRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Unhandled API Crash Intercepted:", err.stack);
    res.status(500).json({ message: "An unexpected internal server error safely caught." });
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  console.log("AI Features Enabled:", !!process.env.GEMINI_API_KEY);
});
