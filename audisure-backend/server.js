// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import documentSearchRoutes from "./routes/document_search.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import uploadRoutes from "./routes/upload.js";
import documentsRoutes from "./routes/documents.js"; // existing documents route
import tasksRoutes from "./routes/tasks.js";
import statusRoutes from "./routes/status.js"; // documents status
import documentsMetaRoutes from "./routes/documents_meta.js"; // <-- new route

import db from "./db.js"; // MySQL pool

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/documents_meta", documentsMetaRoutes);
app.use("/api/document_search", documentSearchRoutes);

// Root landing page
app.get("/", (req, res) => {
  res.send(`
    <div style="font-family: Arial, sans-serif; padding: 2rem; text-align: center;">
      <h1>🚀 Audisure API</h1>
      <p>Status: <strong style="color: green;">Online</strong></p>
      <p>Database: <strong>MySQL Connected ✅</strong></p>
      <p>Version: 1.0.0</p>
      <h3>Available Routes:</h3>
      <ul style="list-style: none; padding: 0;">
        <li><a href="/api/auth">/api/auth</a></li>
        <li><a href="/api/admin">/api/admin</a></li>
        <li><a href="/api/upload">/api/upload</a></li>
        <li><a href="/api/documents">/api/documents</a></li>
        <li><a href="/api/tasks">/api/tasks</a></li>
        <li><a href="/api/status">/api/status</a></li>
        <li><a href="/api/documents_meta/types">/api/documents_meta/types</a></li>
        <li><a href="/api/documents_meta/requirements">/api/documents_meta/requirements</a></li>
      </ul>
    </div>
  `);
});

// Catch-all for unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Start server
const startServer = async () => {
  try {
    // Test MySQL connection
    const connection = await db.getConnection();
    connection.release();
    console.log("✅ MySQL Database connected");

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    process.exit(1);
  }
};

startServer();
