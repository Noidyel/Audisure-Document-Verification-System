// routes/document_search.js
import express from "express";
import db from "../db.js";

const router = express.Router();

// POST: record a document search
router.post("/", async (req, res) => {
  const { user_id, document_uid, searched_at } = req.body;

  if (!user_id || !document_uid || !searched_at) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
    await db.execute(
      "INSERT INTO document_searches (user_id, document_uid, searched_at) VALUES (?, ?, ?)",
      [user_id, document_uid, searched_at]
    );
    res.json({ success: true, message: "Search recorded successfully" });
  } catch (err) {
    console.error("Error recording search:", err);
    res.status(500).json({ success: false, message: "Failed to record search" });
  }
});

export default router;
