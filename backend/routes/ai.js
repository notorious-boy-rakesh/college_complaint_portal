const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { GoogleGenAI } = require("@google/genai");

let ai;
try {
    if (process.env.GEMINI_API_KEY) {
        ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
} catch (e) {
    console.log("Error initializing Gemini API.");
}

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

router.post("/similar-complaints", verifyToken, async (req, res) => {
    const { title, details } = req.body;
    db.query("SELECT title, details FROM complaints WHERE status != 'resolved' ORDER BY id DESC LIMIT 20", async (err, complaints) => {
        if (err || !complaints.length) return res.json({ result: "No active complaints to compare against." });
        try {
            const existingTexts = complaints.map(c => `- Title: ${c.title}\n  Details: ${c.details}`).join("\n");
            const prompt = `You are an AI assistant for a college complaint system. \nA student is about to submit a new complaint:\nTitle: "${title}"\nDetails: "${details}"\n\nHere are recent active complaints:\n${existingTexts}\n\nDo any of these existing complaints seem highly similar to the new one? Be extremely concise.`;
            const aiMessage = await generateAIResponse(prompt);
            res.json({ result: aiMessage });
        } catch (e) {
            res.status(500).json({ result: "An error occurred while generating similarity check." });
        }
    });
});

router.post("/draft-email", verifyAdmin, async (req, res) => {
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
            res.status(500).json({ result: "An error occurred while drafting the email." });
        }
    });
});

router.post("/monthly-report", verifyAdmin, async (req, res) => {
    db.query("SELECT * FROM complaints ORDER BY id DESC LIMIT 50", async (err, complaints) => {
        if (err || !complaints.length) return res.json({ result: "Not enough complaint data to generate a report." });
        try {
            const data = complaints.map(c => `[${c.category}] ${c.title} - Status: ${c.status}`).join("\n");
            const prompt = `You are analyzing complaints data for the college admin. Here are the recent complaints:\n${data}\nPease generate a brief monthly trend report in Markdown format. Highlighting major categories, general student sentiment, and an action item list.`;
            const aiMessage = await generateAIResponse(prompt);
            res.json({ result: aiMessage });
        } catch (e) {
            res.status(500).json({ result: "An error occurred while generating the report." });
        }
    });
});

router.post("/group-complaints", verifyAdmin, async (req, res) => {
    db.query("SELECT id, title, category FROM complaints WHERE status != 'resolved'", async (err, complaints) => {
        if (err || complaints.length === 0) return res.json({ result: "No active complaints to group." });
        try {
            const data = complaints.map(c => `ID:${c.id} | Cat:${c.category} | Title:${c.title}`).join("\n");
            const prompt = `Group the following unresolved complaints logically by theme or similarity so the administration can handle them in batches.\nComplaints:\n${data}\nProvide your grouping concisely in Markdown bullet points.`;
            const aiMessage = await generateAIResponse(prompt);
            res.json({ result: aiMessage });
        } catch (e) {
            res.status(500).json({ result: "An error occurred while grouping complaints." });
        }
    });
});

module.exports = router;
