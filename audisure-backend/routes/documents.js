import express from "express";
import db from "../db.js";

const router = express.Router();

/* ======================================================
   HELPER FUNCTIONS
====================================================== */

function normalizeStatus(status) {
  return String(status || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function getNotificationContent(status, documentTitle, remarks) {
  const title = documentTitle || "your submitted document";

  switch (status) {
    case "needs_revision":
      return {
        notificationTitle: "Document Needs Revision",
        message: remarks
          ? `${title} requires revision. Staff remarks: ${remarks}`
          : `${title} requires revision. Open the application to view more information.`,
        notificationType: "needs_revision",
      };

    case "verified":
    case "pending_admin":
      return {
        notificationTitle: "Document Verified by Staff",
        message: `${title} has been verified by staff and forwarded for final review.`,
        notificationType: "pending_admin",
      };

    case "approved":
      return {
        notificationTitle: "Application Approved",
        message: `${title} has been approved.`,
        notificationType: "approved",
      };

    case "rejected":
      return {
        notificationTitle: "Application Rejected",
        message: remarks
          ? `${title} was rejected. Reason: ${remarks}`
          : `${title} was rejected.`,
        notificationType: "rejected",
      };

    default:
      return {
        notificationTitle: "Document Status Updated",
        message: `${title} now has the status: ${status.replaceAll("_", " ")}.`,
        notificationType: "general",
      };
  }
}

/* ======================================================
   GET ALL DOCUMENTS
   GET /api/documents
====================================================== */
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        d.id,
        d.document_uid,
        d.user_id,

        CONCAT(u.first_name, ' ', u.last_name) AS applicant_name,
        u.email AS user_email,

        d.document_type_id,
        dt.code,
        dt.name AS document_type,

        d.title,
        d.cloudinary_url,
        d.document_hash,
        d.version,
        d.status,
        d.remarks,
        d.created_at,
        d.updated_at

      FROM documents d

      JOIN users u
        ON d.user_id = u.id

      JOIN document_types dt
        ON d.document_type_id = dt.id

      ORDER BY d.created_at DESC
    `);

    res.json({
      success: true,
      documents: rows,
    });
  } catch (err) {
    console.error("GET DOCUMENTS ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch documents.",
    });
  }
});

/* ======================================================
   GET DOCUMENTS BELONGING TO AN APPLICANT

   GET /api/documents/applicant/:email
====================================================== */
router.get("/applicant/:email", async (req, res) => {
  const { email } = req.params;

  try {
    const [rows] = await db.query(
      `
      SELECT
        d.id,
        d.document_uid,
        d.user_id,
        d.document_type_id,

        d.title,
        d.cloudinary_url,
        d.document_hash,
        d.version,
        d.status,
        d.remarks,

        d.remarks AS revision_remarks,

        d.created_at,
        d.updated_at,

        dt.code,
        dt.name AS document_type,
        dt.name AS main_application_type,

        CONCAT(u.first_name, ' ', u.last_name) AS applicant_name,
        u.email AS user_email

      FROM documents d

      JOIN users u
        ON d.user_id = u.id

      JOIN document_types dt
        ON d.document_type_id = dt.id

      WHERE LOWER(u.email) = LOWER(?)

      ORDER BY d.created_at DESC
      `,
      [email]
    );

    res.json({
      success: true,
      documents: rows,
    });
  } catch (err) {
    console.error("GET APPLICANT DOCUMENTS ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve applicant documents.",
    });
  }
});

/* ======================================================
   GET ADMIN QUEUE

   GET /api/documents/pending-admin
====================================================== */
router.get("/pending-admin", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        d.id,
        d.document_uid,

        CONCAT(u.first_name, ' ', u.last_name)
          AS applicant_name,

        u.email,

        dt.code,
        dt.name,

        d.title,
        d.cloudinary_url,
        d.document_hash,
        d.version,
        d.status,
        d.remarks,
        d.created_at,
        d.updated_at

      FROM documents d

      JOIN users u
        ON d.user_id = u.id

      JOIN document_types dt
        ON d.document_type_id = dt.id

      WHERE d.status = 'pending_admin'

      ORDER BY d.created_at DESC
    `);

    res.json({
      success: true,
      documents: rows,
    });
  } catch (err) {
    console.error("GET ADMIN QUEUE ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to load admin queue.",
    });
  }
});

/* ======================================================
   GET ONE DOCUMENT'S FULL INFORMATION

   GET /api/documents/uid/:document_uid
====================================================== */
router.get("/uid/:document_uid", async (req, res) => {
  const { document_uid } = req.params;

  try {
    const [rows] = await db.query(
      `
      SELECT
        d.id,
        d.document_uid,
        d.user_id,
        d.document_type_id,

        d.title,
        d.cloudinary_url,
        d.document_hash,
        d.version,
        d.status,
        d.remarks,

        d.remarks AS revision_remarks,

        d.created_at,
        d.updated_at,

        dt.code,
        dt.name AS document_type,
        dt.name AS main_application_type,

        CONCAT(u.first_name, ' ', u.last_name)
          AS applicant_name,

        u.email AS user_email

      FROM documents d

      JOIN users u
        ON d.user_id = u.id

      JOIN document_types dt
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
    });
  } catch (err) {
    console.error("GET DOCUMENT BY UID ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve document.",
    });
  }
});

/* ======================================================
   GET DOCUMENT HISTORY

   GET /api/documents/history/:document_uid
====================================================== */
router.get("/history/:document_uid", async (req, res) => {
  const { document_uid } = req.params;

  try {
    const [documentRows] = await db.query(
      `
      SELECT
        id,
        document_uid,
        status,
        remarks,
        created_at,
        updated_at
      FROM documents
      WHERE document_uid = ?
      LIMIT 1
      `,
      [document_uid]
    );

    if (documentRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    const document = documentRows[0];

    /*
      This query only assumes that document_history contains document_id.
      It returns every available history column.
    */
    const [historyRows] = await db.query(
      `
      SELECT dh.*
      FROM document_history dh
      WHERE dh.document_id = ?
      ORDER BY dh.id DESC
      `,
      [document.id]
    );

    /*
      If no history entry exists yet, return the document's current state
      so that the Flutter history section is not completely empty.
    */
    if (historyRows.length === 0) {
      return res.json({
        success: true,
        history: [
          {
            status: document.status,
            remarks: document.remarks,
            created_at:
              document.updated_at || document.created_at,
          },
        ],
      });
    }

    res.json({
      success: true,
      history: historyRows,
    });
  } catch (err) {
    console.error("GET DOCUMENT HISTORY ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve document history.",
    });
  }
});

/* ======================================================
   STAFF REVIEW

   PUT /api/documents/review/:document_uid
====================================================== */
router.put("/review/:document_uid", async (req, res) => {
  const { document_uid } = req.params;
  const { status, remarks } = req.body;

  const normalizedStatus = normalizeStatus(status);

  const allowedStatuses = [
    "submitted",
    "pending",
    "pending_staff",
    "needs_revision",
    "verified",
    "pending_admin",
    "approved",
    "rejected",
  ];

  if (!normalizedStatus) {
    return res.status(400).json({
      success: false,
      message: "Status is required.",
    });
  }

  if (!allowedStatuses.includes(normalizedStatus)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status: ${normalizedStatus}`,
    });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [documentRows] = await connection.query(
      `
      SELECT
        d.id,
        d.document_uid,
        d.user_id,
        d.title,
        d.status AS previous_status,
        dt.name AS document_type

      FROM documents d

      LEFT JOIN document_types dt
        ON d.document_type_id = dt.id

      WHERE d.document_uid = ?

      LIMIT 1

      FOR UPDATE
      `,
      [document_uid]
    );

    if (documentRows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    const document = documentRows[0];

    /*
      If the staff frontend sends "verified", convert it to pending_admin
      because the document should move to the admin queue afterward.
    */
    const finalStatus =
      normalizedStatus === "verified"
        ? "pending_admin"
        : normalizedStatus;

    await connection.query(
      `
      UPDATE documents
      SET
        status = ?,
        remarks = ?,
        updated_at = NOW()
      WHERE document_uid = ?
      `,
      [
        finalStatus,
        remarks?.trim() || null,
        document_uid,
      ]
    );

    /*
      Create an applicant notification.
    */
    const notification = getNotificationContent(
      finalStatus,
      document.document_type || document.title,
      remarks?.trim()
    );

    await connection.query(
      `
      INSERT INTO notifications (
        user_id,
        document_id,
        document_uid,
        title,
        message,
        notification_type,
        is_read
      )
      VALUES (?, ?, ?, ?, ?, ?, 0)
      `,
      [
        document.user_id,
        document.id,
        document.document_uid,
        notification.notificationTitle,
        notification.message,
        notification.notificationType,
      ]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Document updated successfully.",
      document_uid,
      previous_status: document.previous_status,
      status: finalStatus,
    });
  } catch (err) {
    await connection.rollback();

    console.error("REVIEW ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to update document.",
    });
  } finally {
    connection.release();
  }
});

/* ======================================================
   GET DOCUMENT FILES

   GET /api/documents/:document_uid

   This generic route must remain last.
====================================================== */
router.get("/:document_uid", async (req, res) => {
  const { document_uid } = req.params;

  try {
    const [rows] = await db.query(
      `
      SELECT
        df.id,
        df.file_name,
        df.cloudinary_url,
        df.created_at

      FROM document_files df

      JOIN documents d
        ON df.document_id = d.id

      WHERE d.document_uid = ?

      ORDER BY df.created_at ASC
      `,
      [document_uid]
    );

    res.json({
      success: true,
      files: rows,
    });
  } catch (err) {
    console.error("GET DOCUMENT FILES ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Unable to load files.",
    });
  }
});

export default router;