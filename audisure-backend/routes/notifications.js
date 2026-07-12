import express from "express";
import db from "../db.js";

const router = express.Router();

/* ======================================================
   GET UNREAD NOTIFICATION COUNT

   GET /api/notifications/unread-count/:email
====================================================== */
router.get("/unread-count/:email", async (req, res) => {
  const { email } = req.params;

  try {
    const [rows] = await db.query(
      `
      SELECT COUNT(*) AS unread_count
      FROM notifications n
      JOIN users u ON n.user_id = u.id
      WHERE LOWER(u.email) = LOWER(?)
        AND n.is_read = 0
      `,
      [email]
    );

    res.json({
      success: true,
      unread_count: Number(rows[0]?.unread_count || 0),
    });
  } catch (err) {
    console.error("GET UNREAD COUNT ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve unread notification count.",
    });
  }
});

/* ======================================================
   MARK ALL NOTIFICATIONS AS READ

   PUT /api/notifications/read-all/:email
====================================================== */
router.put("/read-all/:email", async (req, res) => {
  const { email } = req.params;

  try {
    const [result] = await db.query(
      `
      UPDATE notifications n
      JOIN users u ON n.user_id = u.id
      SET n.is_read = 1
      WHERE LOWER(u.email) = LOWER(?)
      `,
      [email]
    );

    res.json({
      success: true,
      message: "All notifications marked as read.",
      updated_count: result.affectedRows,
    });
  } catch (err) {
    console.error("MARK ALL READ ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to mark notifications as read.",
    });
  }
});

/* ======================================================
   MARK ONE NOTIFICATION AS READ

   PUT /api/notifications/:id/read
====================================================== */
router.put("/:id/read", async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query(
      `
      UPDATE notifications
      SET is_read = 1
      WHERE id = ?
      `,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    res.json({
      success: true,
      message: "Notification marked as read.",
    });
  } catch (err) {
    console.error("MARK NOTIFICATION READ ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read.",
    });
  }
});

/* ======================================================
   GET NOTIFICATIONS FOR APPLICANT

   GET /api/notifications/:email

   Keep this below the more specific routes.
====================================================== */
router.get("/:email", async (req, res) => {
  const { email } = req.params;

  try {
    const [rows] = await db.query(
      `
      SELECT
        n.id,
        n.user_id,
        n.document_id,
        n.document_uid,
        n.title,
        n.message,
        n.notification_type,
        n.is_read,
        n.created_at,

        d.title AS document_title,
        d.status AS document_status,
        d.remarks,
        d.document_type_id,

        dt.code,
        dt.name AS document_type

      FROM notifications n

      JOIN users u
        ON n.user_id = u.id

      LEFT JOIN documents d
        ON n.document_id = d.id

      LEFT JOIN document_types dt
        ON d.document_type_id = dt.id

      WHERE LOWER(u.email) = LOWER(?)

      ORDER BY n.created_at DESC
      `,
      [email]
    );

    res.json({
      success: true,
      notifications: rows,
    });
  } catch (err) {
    console.error("GET NOTIFICATIONS ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve notifications.",
    });
  }
});

export default router;