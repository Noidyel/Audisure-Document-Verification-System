import express from "express";
import db from "../db.js";

const router = express.Router();

/* ======================================================
   GET ALL DOCUMENTS FOR A USER

   GET /api/status?user_id=123
====================================================== */
router.get("/", async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({
      success: false,
      message: "Missing user_id parameter.",
    });
  }

  try {
    const [documents] = await db.query(
      `
      SELECT
        d.id,
        d.document_uid,
        d.title,
        d.status,
        d.remarks,
        d.created_at,
        d.updated_at,

        dt.code,
        dt.name AS document_type

      FROM documents d

      LEFT JOIN document_types dt
        ON d.document_type_id = dt.id

      WHERE d.user_id = ?

      ORDER BY d.created_at DESC
      `,
      [user_id]
    );

    res.json({
      success: true,
      documents,
    });
  } catch (err) {
    console.error("FETCH USER DOCUMENTS ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
});

/* ======================================================
   GET ONE DOCUMENT'S STATUS

   GET /api/status/document?document_uid=ABC123
====================================================== */
router.get("/document", async (req, res) => {
  const { document_uid } = req.query;

  if (!document_uid) {
    return res.status(400).json({
      success: false,
      message: "Missing document_uid parameter.",
    });
  }

  try {
    const [rows] = await db.query(
      `
      SELECT
        d.document_uid,
        d.title,
        d.status,
        d.remarks,
        d.created_at,
        d.updated_at,

        dt.code,
        dt.name AS document_type

      FROM documents d

      LEFT JOIN document_types dt
        ON d.document_type_id = dt.id

      WHERE d.document_uid = ?

      LIMIT 1
      `,
      [document_uid]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    res.json({
      success: true,
      document: rows[0],
      status: rows[0].status,
    });
  } catch (err) {
    console.error("FETCH DOCUMENT STATUS ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
});

export default router;