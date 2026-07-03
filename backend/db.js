const mysql = require("mysql2");
require('dotenv').config();

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "rakesh",
  database: process.env.DB_NAME || "college_portal",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

db.getConnection((err, connection) => {
  if (err) {
    console.error("Database connection failed:", err.message);
  } else {
    console.log("MySQL Pooled Connection Established");
    connection.release();
  }
});

module.exports = db;
