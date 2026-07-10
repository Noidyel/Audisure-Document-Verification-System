// routes/upload.js

import express from "express";
import db from "../db.js";

const router = express.Router();

// Create a new document submission
router.post("/", async (req, res) => {
  const {
    user_email,
    document_type_id,
    title,
    files // [{ requirement_id, cloudinary_url, file_name }]
  } = req.body;

  if (!user_email || !document_type_id || !files || files.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields."
    });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Get applicant ID
    const [userRows] = await connection.execute(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [user_email]
    );

    if (userRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Applicant not found."
      });
    }

    const userId = userRows[0].id;

    // Generate UID
    const documentUid =
      "DOC" +
      Date.now() +
      Math.floor(Math.random() * 1000);

    // Create document
    await connection.execute(
      `
      INSERT INTO documents
      (
        document_uid,
        user_id,
        document_type_id,
        title,
        status
      )
      VALUES (?, ?, ?, ?, 'pending_staff')
      `,
      [
        documentUid,
        userId,
        document_type_id,
        title
      ]
    );

    // Get inserted document ID
    const [docRows] = await connection.execute(
      "SELECT id FROM documents WHERE document_uid=?",
      [documentUid]
    );

    const documentId = docRows[0].id;

    // Save uploaded files
    for (const file of files) {
      await connection.execute(
        `
        INSERT INTO document_files
        (
          document_id,
          requirement_id,
          file_name,
          cloudinary_url
        )
        VALUES (?, ?, ?, ?)
        `,
        [
          documentId,
          file.requirement_id,
          file.file_name,
          file.cloudinary_url
        ]
      );
    }

    // Initial history
    await connection.execute(
      `
      INSERT INTO document_history
      (
        document_uid,
        status,
        changed_by
      )
      VALUES
      (?, 'pending_staff', ?)
      `,
      [
        documentUid,
        userId
      ]
    );

    await connection.commit();

    res.json({
      success: true,
      document_uid: documentUid,
      message: "Submission created successfully."
    });

  } catch (err) {
    await connection.rollback();
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to create submission."
    });

  } finally {
    connection.release();
  }
});

export default router;