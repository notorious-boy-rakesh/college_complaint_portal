require("dotenv").config();
const mysql = require("mysql2");
const { GoogleGenAI } = require("@google/genai");

async function checkKeys() {
  console.log("=== API Keys & Configuration Verification ===\n");

  // 1. Check Database Credentials
  console.log("1. Checking Database Connectivity...");
  const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "rakesh",
    database: process.env.DB_NAME || "college_portal",
  });

  try {
    await new Promise((resolve, reject) => {
      db.connect((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log("   [OK] Successfully connected to MySQL Database!\n");
  } catch (err) {
    console.error("   [FAILED] Could not connect to the database.");
    console.error("   Error Details:", err.message, "\n");
  } finally {
    db.end();
  }

  // 2. Check JWT Secret
  console.log("2. Checking JWT Secret...");
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim() !== "") {
    console.log(`   [OK] JWT_SECRET is loaded: ${process.env.JWT_SECRET.substring(0, 5)}***\n`);
  } else {
    console.error("   [FAILED] JWT_SECRET is missing or empty in .env.\n");
  }

  // 3. Check Gemini API Key
  console.log("3. Checking Gemini API Key...");
  if (!process.env.GEMINI_API_KEY) {
    console.error("   [FAILED] GEMINI_API_KEY is completely missing in .env.\n");
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    console.log("   Attempting a simple generation request to verify the key...");
    
    // Test the API with a small prompt
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Respond with exactly: "Hello"',
    });

    if (response && response.text) {
      console.log(`   [OK] Gemini API responded successfully! Response: "${response.text.trim()}"\n`);
    } else {
      console.log("   [WARNING] Response received but format was unexpected.\n");
    }
  } catch (err) {
    console.error("   [FAILED] There was an issue using the Gemini API Key.");
    console.error("   Error Details:");
    console.error("   Message:", err.message);
    if (err.status) console.error("   Status:", err.status);
    console.log("\n   You may need to recreate the key in Google AI Studio if it is invalid.");
  }
}

checkKeys();
