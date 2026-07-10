// status.js
import express from "express";
import db from "../db.js";

const router = express.Router();

/* ------------------------------------------
   ✅ Route 1: Fetch all documents for a user
   Example: GET /api/status?user_id=123
------------------------------------------ */
router.get("/", async (req, res) => {
  const { user_id } = req.query;

  if (user_id) {
    try {
      const sql = `
        SELECT d.document_uid, d.title, d.created_at,
          (SELECT ds.status
           FROM documents_statuses ds
           WHERE ds.document_uid = d.document_uid
           ORDER BY ds.updated_at DESC
           LIMIT 1) AS status
        FROM documents d
        WHERE d.user_id = ?
        ORDER BY d.created_at DESC
      `;
      const [documents] = await db.query(sql, [user_id]);
      return res.json({ success: true, documents });
    } catch (err) {
      console.error("Fetch documents error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }

  // ⚠️ If no user_id is provided, move to the next handler
  res.status(400).json({ success: false, message: "Missing user_id parameter" });
});

/* ------------------------------------------
   ✅ Route 2: Fetch status of ONE document
   Example: GET /api/status/document?document_uid=ABC123
------------------------------------------ */
router.get("/document", async (req, res) => {
  const { document_uid } = req.query;

  if (!document_uid) {
    return res.status(400).json({ success: false, message: "Missing document_uid parameter" });
  }

  try {
    const sql = `
      SELECT d.document_uid, d.title,
        (SELECT ds.status
         FROM documents_statuses ds
         WHERE ds.document_uid = d.document_uid
         ORDER BY ds.updated_at DESC
         LIMIT 1) AS status
      FROM documents d
      WHERE d.document_uid = ?
      LIMIT 1
    `;

    const [rows] = await db.query(sql, [document_uid]);
    if (rows.length === 0) {
      return res.json({ success: false, message: "Document not found" });
    }

    res.json({ success: true, status: rows[0].status });
  } catch (err) {
    console.error("Fetch single document status error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
