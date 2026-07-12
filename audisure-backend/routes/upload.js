import express from "express";
import db from "../db.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const {
    user_email,
    document_type_id,
    title,
    cloudinary_url,
  } = req.body;

  if (
    !user_email ||
    !document_type_id ||
    !title ||
    !cloudinary_url
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Missing user_email, document_type_id, title, or cloudinary_url.",
    });
  }

  try {
    const [userRows] = await db.execute(
      `
      SELECT id
      FROM users
      WHERE LOWER(email) = LOWER(?)
      LIMIT 1
      `,
      [user_email.trim()]
    );

    if (userRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Applicant account not found.",
      });
    }

    const userId = userRows[0].id;

    const [typeRows] = await db.execute(
      `
      SELECT id, code
      FROM document_types
      WHERE id = ?
      LIMIT 1
      `,
      [document_type_id]
    );

    if (typeRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Document type not found.",
      });
    }

    const typeCode = typeRows[0].code || "DOC";

    const randomPart = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    const documentUid =
      `${typeCode}-${Date.now()}-${randomPart}`;

    const [result] = await db.execute(
      `
      INSERT INTO documents (
        document_uid,
        user_id,
        document_type_id,
        title,
        cloudinary_url,
        document_hash,
        version,
        status,
        remarks,
        created_at,
        updated_at
      )
      VALUES (
        ?, ?, ?, ?, ?,
        NULL,
        1,
        'pending_staff',
        NULL,
        NOW(),
        NOW()
      )
      `,
      [
        documentUid,
        userId,
        document_type_id,
        title,
        cloudinary_url,
      ]
    );

    await db.execute(
      `
      INSERT INTO document_history (
        document_uid,
        status,
        remarks,
        changed_by,
        created_at
      )
      VALUES (
        ?,
        'pending_staff',
        NULL,
        ?,
        NOW()
      )
      `,
      [documentUid, userId]
    );

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully.",
      document_id: result.insertId,
      document_uid: documentUid,
      cloudinary_url,
    });
  } catch (error) {
    console.error("Upload route error:", error);

    return res.status(500).json({
      success: false,
      message:
        error.sqlMessage ||
        error.message ||
        "Failed to save application.",
    });
  }
});

export default router;