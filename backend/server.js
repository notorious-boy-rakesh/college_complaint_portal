require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { GoogleGenAI } = require("@google/genai");
const db = require("./db");
const PDFDocument = require("pdfkit");

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";
let ai;
try {
  if (process.env.GEMINI_API_KEY) {
      ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
} catch (e) {
  console.log("Error initializing Gemini API.");
}

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

// ... Middlewares ...
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Access Denied: No Token Provided" });
  const token = authHeader.split(" ")[1];
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).json({ message: "Invalid Token" });
  }
};

const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role === "admin") {
      next();
    } else {
      res.status(403).json({ message: "Access Denied: Admins Only" });
    }
  });
};

/* ================= AUTHENTICATION ================= */
app.post("/signup", async (req, res) => {
  try {
    const { name, regNumber, password } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const sql = "INSERT INTO users (name, regNumber, password, role) VALUES (?, ?, ?, 'student')";
    db.query(sql, [name, regNumber, hashedPassword], err => {
      if (err) return res.status(400).json({ message: "User already exists" });
      res.json({ message: "Signup successful" });
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/login", (req, res) => {
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
      
      // Check password (fallback for non-hashed admin seeded password)
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
      console.error("Login verification crash:", compareErr);
      res.status(500).json({ message: "Authentication validation error." });
    }
  });
});

/* ================= STUDENT ROUTES ================= */
app.post("/complaint", verifyToken, (req, res) => {
  const { category, title, details } = req.body;
  const studentName = req.user.name;
  const regNumber = req.user.regNumber;

  const sql = `INSERT INTO complaints (studentName, regNumber, category, title, details) VALUES (?, ?, ?, ?, ?)`;
  db.query(sql, [studentName, regNumber, category, title, details], err => {
    if (err) return res.status(500).json({ message: "Failed to submit complaint" });
    res.json({ message: "Complaint submitted successfully" });
  });
});

app.get("/complaints/my", verifyToken, (req, res) => {
  db.query(
    "SELECT * FROM complaints WHERE regNumber=? ORDER BY id DESC",
    [req.user.regNumber],
    (err, result) => {
      if(err) return res.status(500).json({message: "Failed to fetch"});
      res.json(result);
    }
  );
});

/* ================= ADMIN ROUTES ================= */
app.get("/admin/complaints", verifyAdmin, (req, res) => {
  db.query("SELECT * FROM complaints ORDER BY id DESC", (err, result) => {
    if (err) return res.status(500).json({ message: "Failed to fetch" });
    res.json(result);
  });
});

app.put("/admin/complaint/:id", verifyAdmin, (req, res) => {
  const { status } = req.body;
  db.query("UPDATE complaints SET status=? WHERE id=?", [status, req.params.id], err => {
    if (err) return res.status(500).json({ message: "Failed to update" });
    res.json({ message: "Status updated" });
  });
});

app.delete("/admin/complaints", verifyAdmin, (req, res) => {
  db.query("DELETE FROM complaints", err => {
    if (err) return res.status(500).json({ message: "Failed to delete all complaints" });
    db.query("ALTER TABLE complaints AUTO_INCREMENT = 1", err2 => {
      if (err2) console.error("Failed to reset auto increment:", err2);
      res.json({ message: "All complaints erased and ID counter reset to 1" });
    });
  });
});

app.delete("/admin/complaint/:id", verifyAdmin, (req, res) => {
  db.query("DELETE FROM complaints WHERE id=?", [req.params.id], err => {
    if (err) return res.status(500).json({ message: "Failed to delete" });
    res.json({ message: "Complaint deleted" });
  });
});

app.put("/admin/complaints/resolve-all", verifyAdmin, (req, res) => {
  db.query("UPDATE complaints SET status='resolved'", err => {
    if (err) return res.status(500).json({ message: "Failed to update complaints" });
    res.json({ message: "All complaints marked as resolved" });
  });
});

app.get("/admin/students", verifyAdmin, (req, res) => {
  db.query("SELECT name, regNumber FROM users WHERE role='student'", (err, results) => {
    if (err) return res.status(500).json({ message: "Failed to load students" });
    res.json(results);
  });
});

app.delete("/admin/student/:regNumber", verifyAdmin, (req, res) => {
  const reg = req.params.regNumber;
  db.query("DELETE FROM users WHERE regNumber=? AND role='student'", [reg], err => {
    if (err) return res.status(500).json({ message: "Failed to delete student" });
    db.query("DELETE FROM complaints WHERE regNumber=?", [reg], err2 => {
      if (err2) return res.status(500).json({ message: "Student deleted but failed to delete complaints" });
      res.json({ message: "Student and their complaints deleted successfully" });
    });
  });
});

/* ================= MAIL INBOX ROUTES ================= */
app.post("/admin/mail/send", verifyAdmin, (req, res) => {
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

app.get("/mail/inbox", verifyToken, (req, res) => {
  db.query(
    "SELECT * FROM mail_inbox WHERE toRegNumber=? ORDER BY sentAt DESC",
    [req.user.regNumber],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Failed to fetch inbox" });
      res.json(results);
    }
  );
});

app.get("/mail/unread-count", verifyToken, (req, res) => {
  db.query(
    "SELECT COUNT(*) as count FROM mail_inbox WHERE toRegNumber=? AND isRead=0",
    [req.user.regNumber],
    (err, results) => {
      if (err) return res.status(500).json({ count: 0 });
      res.json({ count: results[0].count });
    }
  );
});

app.put("/mail/mark-read", verifyToken, (req, res) => {
  db.query(
    "UPDATE mail_inbox SET isRead=1 WHERE toRegNumber=?",
    [req.user.regNumber],
    err => {
      if (err) return res.status(500).json({ message: "Failed to mark as read" });
      res.json({ message: "All marked as read" });
    }
  );
});

app.get("/admin/complaints/export/pdf", (req, res) => {
  // Exporting to PDF usually needs a token too, but simple anchors limit headers.
  // Assuming simple access for prototype.
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

/* ================= AI ROUTES ================= */
async function generateAIResponse(prompt) {
    if (!ai) {
        return "⚠️ AI Service Mock Response: The backend is missing the GEMINI_API_KEY. Add it to backend/.env to get real AI-generated analytics.\n\nSimulated result: We found somewhat similar patterns recently. Action might be required soon.";
    }
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text;
    } catch(e) {
        console.error("AI Generation Error", e);
        return "⚠️ Failed to generate AI response. Make sure the API key is valid.";
    }
}

app.post("/api/ai/similar-complaints", verifyToken, async (req, res) => {
    const { title, details } = req.body;
    db.query("SELECT title, details FROM complaints WHERE status != 'resolved' ORDER BY id DESC LIMIT 20", async (err, complaints) => {
        if (err || !complaints.length) return res.json({ result: "No active complaints to compare against." });
        try {
            const existingTexts = complaints.map(c => `- Title: ${c.title}\n  Details: ${c.details}`).join("\n");
            const prompt = `You are an AI assistant for a college complaint system. \nA student is about to submit a new complaint:\nTitle: "${title}"\nDetails: "${details}"\n\nHere are recent active complaints:\n${existingTexts}\n\nDo any of these existing complaints seem highly similar to the new one? Be extremely concise.`;
            const aiMessage = await generateAIResponse(prompt);
            res.json({ result: aiMessage });
        } catch (e) {
            console.error("AI Similar Error", e);
            res.status(500).json({ result: "An error occurred while generating similarity check." });
        }
    });
});

app.post("/api/ai/draft-email", verifyAdmin, async (req, res) => {
    const { complaintId } = req.body;
    let sql = "SELECT * FROM complaints WHERE status='pending' ORDER BY id ASC LIMIT 1";
    let params = [];
    
    if (complaintId) {
        sql = "SELECT * FROM complaints WHERE id=?";
        params = [complaintId];
    }
    
    db.query(sql, params, async (err, result) => {
        if (err || result.length === 0) return res.json({ result: "No pending complaints found to draft emails for." });
        try {
            const c = result[0];
            const prompt = `Draft a very brief, professional, and empathetic email response from the university administration to a student named ${c.studentName}. \nThey submitted a complaint:\nTitle: ${c.title}\nDetails: ${c.details}\nCurrent Status: ${c.status}.\nThe email should assure them the matter is being looked into. Do not include subject line block as we have our own. Limit to 3 sentences.`;
            const aiMessage = await generateAIResponse(prompt);
            res.json({ result: aiMessage });
        } catch (e) {
            console.error("AI Draft Error", e);
            res.status(500).json({ result: "An error occurred while drafting the email." });
        }
    });
});

app.post("/api/ai/monthly-report", verifyAdmin, async (req, res) => {
    db.query("SELECT * FROM complaints ORDER BY id DESC LIMIT 50", async (err, complaints) => {
        if (err || !complaints.length) return res.json({ result: "Not enough complaint data to generate a report." });
        try {
            const data = complaints.map(c => `[${c.category}] ${c.title} - Status: ${c.status}`).join("\n");
            const prompt = `You are analyzing complaints data for the college admin. Here are the recent complaints:\n${data}\nPease generate a brief monthly trend report in Markdown format. Highlighting major categories, general student sentiment, and an action item list.`;
            const aiMessage = await generateAIResponse(prompt);
            res.json({ result: aiMessage });
        } catch (e) {
            console.error("AI Report Error", e);
            res.status(500).json({ result: "An error occurred while generating the report." });
        }
    });
});

app.post("/api/ai/group-complaints", verifyAdmin, async (req, res) => {
    db.query("SELECT id, title, category FROM complaints WHERE status != 'resolved'", async (err, complaints) => {
        if (err || complaints.length === 0) return res.json({ result: "No active complaints to group." });
        try {
            const data = complaints.map(c => `ID:${c.id} | Cat:${c.category} | Title:${c.title}`).join("\n");
            const prompt = `Group the following unresolved complaints logically by theme or similarity so the administration can handle them in batches.\nComplaints:\n${data}\nProvide your grouping concisely in Markdown bullet points.`;
            const aiMessage = await generateAIResponse(prompt);
            res.json({ result: aiMessage });
        } catch (e) {
            console.error("AI Group Error", e);
            res.status(500).json({ result: "An error occurred while grouping complaints." });
        }
    });
});

/* ================= GLOBAL ERROR HANDLING ================= */
app.use((err, req, res, next) => {
    console.error("Unhandled API Crash Intercepted:", err.stack);
    res.status(500).json({ message: "An unexpected internal server error safely caught." });
});

/* ================= SERVER START ================= */
app.listen(3004, () => {
  console.log("Backend running on http://localhost:3004");
  console.log("AI Features Enabled:", !!process.env.GEMINI_API_KEY);
});
