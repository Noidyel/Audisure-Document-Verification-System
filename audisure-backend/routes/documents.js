import express from "express";
import db from "../db.js";
import cloudinary from "../config/cloudinary.js";

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

async function moveCloudinaryAsset({
  publicId,
  resourceType = "image",
  destinationFolder,
}) {
  if (!publicId) {
    throw new Error(
      "The document has no Cloudinary public ID and cannot be moved."
    );
  }

  const result = await cloudinary.uploader.explicit(publicId, {
    type: "upload",
    resource_type: resourceType || "image",
    asset_folder: destinationFolder,
  });

  return {
    publicId: result.public_id || publicId,
    assetId: result.asset_id || null,
    secureUrl: result.secure_url || null,
    resourceType:
      result.resource_type || resourceType || "image",
    assetFolder:
      result.asset_folder || destinationFolder,
  };
}

function getNotificationContent(
  status,
  documentTitle,
  remarks
) {
  const title =
    documentTitle || "your submitted document";

  switch (status) {
    case "needs_revision":
      return {
        notificationTitle:
          "Document Needs Revision",
        message: remarks
          ? `${title} requires revision. Staff remarks: ${remarks}`
          : `${title} requires revision. Open the application to view more information.`,
        notificationType: "needs_revision",
      };

    case "verified":
    case "pending_admin":
      return {
        notificationTitle:
          "Document Verified by Staff",
        message:
          `${title} has been verified by staff and forwarded for final review.`,
        notificationType: "pending_admin",
      };

    case "approved":
      return {
        notificationTitle:
          "Application Approved",
        message: `${title} has been approved.`,
        notificationType: "approved",
      };

    case "rejected":
      return {
        notificationTitle:
          "Application Rejected",
        message: remarks
          ? `${title} was rejected. Reason: ${remarks}`
          : `${title} was rejected.`,
        notificationType: "rejected",
      };

    default:
      return {
        notificationTitle:
          "Document Status Updated",
        message:
          `${title} now has the status: ${status.replaceAll("_", " ")}.`,
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

        CONCAT(
          u.first_name,
          ' ',
          u.last_name
        ) AS applicant_name,

        u.email AS user_email,

        d.document_type_id,
        dt.code,
        dt.name AS document_type,

        d.title,
        d.cloudinary_url,
        d.cloudinary_public_id,
        d.cloudinary_asset_id,
        d.cloudinary_resource_type,
        d.cloudinary_folder,

        d.document_hash,
        d.approved_hash,
        d.approved_by,
        d.approved_at,
        d.is_locked,

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

    return res.json({
      success: true,
      documents: rows,
    });
  } catch (error) {
    console.error(
      "GET DOCUMENTS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.sqlMessage ||
        "Failed to fetch documents.",
    });
  }
});

/* ======================================================
   GET DOCUMENTS BELONGING TO AN APPLICANT

   GET /api/documents/applicant/:email
====================================================== */

router.get(
  "/applicant/:email",
  async (req, res) => {
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
          d.cloudinary_public_id,
          d.cloudinary_asset_id,
          d.cloudinary_resource_type,
          d.cloudinary_folder,

          d.document_hash,
          d.approved_hash,
          d.approved_at,
          d.is_locked,

          d.version,
          d.status,
          d.remarks,
          d.remarks AS revision_remarks,

          d.created_at,
          d.updated_at,

          dt.code,
          dt.name AS document_type,
          dt.name AS main_application_type,

          CONCAT(
            u.first_name,
            ' ',
            u.last_name
          ) AS applicant_name,

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

      return res.json({
        success: true,
        documents: rows,
      });
    } catch (error) {
      console.error(
        "GET APPLICANT DOCUMENTS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.sqlMessage ||
          "Failed to retrieve applicant documents.",
      });
    }
  }
);

/* ======================================================
   GET ADMIN QUEUE

   GET /api/documents/pending-admin
====================================================== */

router.get(
  "/pending-admin",
  async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT
          d.id,
          d.document_uid,
          d.user_id,

          CONCAT(
            u.first_name,
            ' ',
            u.last_name
          ) AS applicant_name,

          u.email,
          u.email AS user_email,

          d.document_type_id,
          dt.code,
          dt.name,
          dt.name AS document_type,

          d.title,
          d.cloudinary_url,
          d.cloudinary_public_id,
          d.cloudinary_asset_id,
          d.cloudinary_resource_type,
          d.cloudinary_folder,

          d.document_hash,
          d.approved_hash,
          d.approved_by,
          d.approved_at,
          d.is_locked,

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

      return res.json({
        success: true,
        documents: rows,
      });
    } catch (error) {
      console.error(
        "GET ADMIN QUEUE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.sqlMessage ||
          "Failed to load admin queue.",
      });
    }
  }
);

/* ======================================================
   GET ONE DOCUMENT'S FULL INFORMATION

   GET /api/documents/uid/:document_uid
====================================================== */

router.get(
  "/uid/:document_uid",
  async (req, res) => {
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
          d.cloudinary_public_id,
          d.cloudinary_asset_id,
          d.cloudinary_resource_type,
          d.cloudinary_folder,

          d.document_hash,
          d.approved_hash,
          d.approved_by,
          d.approved_at,
          d.is_locked,

          d.version,
          d.status,
          d.remarks,
          d.remarks AS revision_remarks,

          d.created_at,
          d.updated_at,

          dt.code,
          dt.name AS document_type,
          dt.name AS main_application_type,

          CONCAT(
            u.first_name,
            ' ',
            u.last_name
          ) AS applicant_name,

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

      return res.json({
        success: true,
        document: rows[0],
      });
    } catch (error) {
      console.error(
        "GET DOCUMENT BY UID ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.sqlMessage ||
          "Failed to retrieve document.",
      });
    }
  }
);

/* ======================================================
   GET DOCUMENT HISTORY

   GET /api/documents/history/:document_uid
====================================================== */

router.get(
  "/history/:document_uid",
  async (req, res) => {
    const { document_uid } = req.params;

    try {
      const [documentRows] = await db.query(
        `
        SELECT
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

      const [historyRows] = await db.query(
        `
        SELECT
          dh.*

        FROM document_history dh

        WHERE dh.document_uid = ?

        ORDER BY dh.created_at DESC
        `,
        [document_uid]
      );

      if (historyRows.length === 0) {
        return res.json({
          success: true,
          history: [
            {
              document_uid:
                document.document_uid,
              status: document.status,
              remarks: document.remarks,
              created_at:
                document.updated_at ||
                document.created_at,
            },
          ],
        });
      }

      return res.json({
        success: true,
        history: historyRows,
      });
    } catch (error) {
      console.error(
        "GET DOCUMENT HISTORY ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.sqlMessage ||
          "Failed to retrieve document history.",
      });
    }
  }
);

/* ======================================================
   STAFF REVIEW

   PUT /api/documents/review/:document_uid
====================================================== */

router.put(
  "/review/:document_uid",
  async (req, res) => {
    const { document_uid } = req.params;

    const {
      status,
      remarks,
      changed_by,
    } = req.body;

    const normalizedStatus =
      normalizeStatus(status);

    const allowedStatuses = [
      "needs_revision",
      "verified",
      "pending_admin",
    ];

    if (!normalizedStatus) {
      return res.status(400).json({
        success: false,
        message: "Status is required.",
      });
    }

    if (
      !allowedStatuses.includes(
        normalizedStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Staff may only verify a document or request revision.",
      });
    }

    const normalizedRemarks =
      String(remarks || "").trim();

    if (
      normalizedStatus ===
        "needs_revision" &&
      !normalizedRemarks
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Remarks are required when requesting a revision.",
      });
    }

    const connection =
      await db.getConnection();

    let cloudinaryMoved = false;

    let previousFolder = null;

    let cloudinaryPublicId = null;

    let cloudinaryResourceType =
      "image";

    try {
      await connection.beginTransaction();

      const [documentRows] =
        await connection.query(
          `
          SELECT
            d.id,
            d.document_uid,
            d.user_id,
            d.title,

            d.status AS previous_status,
            d.is_locked,

            d.cloudinary_url,
            d.cloudinary_public_id,
            d.cloudinary_asset_id,
            d.cloudinary_resource_type,
            d.cloudinary_folder,

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

      const document =
        documentRows[0];

      if (
        Number(document.is_locked) === 1
      ) {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message:
            "This document is locked and can no longer be reviewed.",
        });
      }

      const reviewableStatuses = [
        "pending_staff",
        "needs_revision",
        "resubmitted",
      ];

      if (
        !reviewableStatuses.includes(
          document.previous_status
        )
      ) {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message:
            `Document cannot be reviewed from status '${document.previous_status}'.`,
        });
      }

      const finalStatus =
        normalizedStatus === "verified"
          ? "pending_admin"
          : normalizedStatus;

      let updatedCloudinaryFolder =
        document.cloudinary_folder ||
        "audisure/applicant-submissions";

      let updatedCloudinaryUrl =
        document.cloudinary_url;

      let updatedCloudinaryAssetId =
        document.cloudinary_asset_id;

      cloudinaryPublicId =
        document.cloudinary_public_id;

      cloudinaryResourceType =
        document.cloudinary_resource_type ||
        "image";

      previousFolder =
        updatedCloudinaryFolder;

      /*
       * Only verified documents move to
       * audisure/staff-verified.
       *
       * Needs-revision documents remain in
       * audisure/applicant-submissions.
       */
      if (
        finalStatus === "pending_admin"
      ) {
        const destinationFolder =
          "audisure/staff-verified";

        const movedAsset =
          await moveCloudinaryAsset({
            publicId:
              cloudinaryPublicId,
            resourceType:
              cloudinaryResourceType,
            destinationFolder,
          });

        cloudinaryMoved = true;

        updatedCloudinaryFolder =
          movedAsset.assetFolder;

        updatedCloudinaryUrl =
          movedAsset.secureUrl ||
          updatedCloudinaryUrl;

        updatedCloudinaryAssetId =
          movedAsset.assetId ||
          updatedCloudinaryAssetId;

        cloudinaryPublicId =
          movedAsset.publicId;

        cloudinaryResourceType =
          movedAsset.resourceType;
      }

      await connection.query(
        `
        UPDATE documents

        SET
          status = ?,
          remarks = ?,

          cloudinary_url = ?,
          cloudinary_public_id = ?,
          cloudinary_asset_id = ?,
          cloudinary_resource_type = ?,
          cloudinary_folder = ?,

          updated_at = NOW()

        WHERE document_uid = ?
        `,
        [
          finalStatus,
          normalizedRemarks || null,

          updatedCloudinaryUrl,
          cloudinaryPublicId,
          updatedCloudinaryAssetId,
          cloudinaryResourceType,
          updatedCloudinaryFolder,

          document_uid,
        ]
      );

      await connection.query(
        `
        INSERT INTO document_history (
          document_uid,
          status,
          remarks,
          changed_by,
          created_at
        )
        VALUES (?, ?, ?, ?, NOW())
        `,
        [
          document_uid,
          finalStatus,
          normalizedRemarks || null,
          changed_by ||
            document.user_id,
        ]
      );

      const notification =
        getNotificationContent(
          finalStatus,
          document.document_type ||
            document.title,
          normalizedRemarks
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

      return res.json({
        success: true,
        message:
          finalStatus === "pending_admin"
            ? "Document verified and forwarded to admin."
            : "Revision requested successfully.",

        document_uid,

        previous_status:
          document.previous_status,

        status: finalStatus,

        cloudinary_folder:
          updatedCloudinaryFolder,

        cloudinary_url:
          updatedCloudinaryUrl,
      });
    } catch (error) {
      await connection.rollback();

      /*
       * If Cloudinary moved successfully but the
       * database operation failed, attempt to return
       * the asset to its previous folder.
       */
      if (
        cloudinaryMoved &&
        cloudinaryPublicId &&
        previousFolder
      ) {
        try {
          await moveCloudinaryAsset({
            publicId:
              cloudinaryPublicId,
            resourceType:
              cloudinaryResourceType,
            destinationFolder:
              previousFolder,
          });
        } catch (
          compensationError
        ) {
          console.error(
            "CLOUDINARY MOVE ROLLBACK ERROR:",
            compensationError
          );
        }
      }

      console.error(
        "REVIEW ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to update document.",
      });
    } finally {
      connection.release();
    }
  }
);

/* ======================================================
   ADMIN FINAL REVIEW

   PUT /api/documents/admin-review/:document_uid

   Body:
   {
     "status": "approved" | "rejected",
     "remarks": "optional for approval, required for rejection",
     "changed_by": 1
   }
====================================================== */

router.put(
  "/admin-review/:document_uid",
  async (req, res) => {
    const { document_uid } = req.params;

    const {
      status,
      remarks,
      changed_by,
    } = req.body;

    const normalizedStatus =
      normalizeStatus(status);

    const allowedStatuses = [
      "approved",
      "rejected",
    ];

    if (!normalizedStatus) {
      return res.status(400).json({
        success: false,
        message: "Status is required.",
      });
    }

    if (
      !allowedStatuses.includes(
        normalizedStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Admin may only approve or reject a document.",
      });
    }

    const normalizedRemarks =
      String(remarks || "").trim();

    if (
      normalizedStatus === "rejected" &&
      !normalizedRemarks
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Remarks are required when rejecting a document.",
      });
    }

    const connection =
      await db.getConnection();

    let cloudinaryMoved = false;
    let previousFolder = null;
    let cloudinaryPublicId = null;
    let cloudinaryResourceType = "image";

    try {
      await connection.beginTransaction();

      const [documentRows] =
        await connection.query(
          `
          SELECT
            d.id,
            d.document_uid,
            d.user_id,
            d.title,
            d.document_hash,

            d.status AS previous_status,
            d.is_locked,

            d.cloudinary_url,
            d.cloudinary_public_id,
            d.cloudinary_asset_id,
            d.cloudinary_resource_type,
            d.cloudinary_folder,

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

      if (
        Number(document.is_locked) === 1
      ) {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message:
            "This document has already received a final decision and is locked.",
        });
      }

      if (
        document.previous_status !==
        "pending_admin"
      ) {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message:
            `Document cannot receive an admin decision from status '${document.previous_status}'.`,
        });
      }

      if (
        normalizedStatus === "approved" &&
        !document.document_hash
      ) {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message:
            "This document has no SHA-256 hash and cannot be approved.",
        });
      }

      let updatedCloudinaryFolder =
        document.cloudinary_folder ||
        "audisure/staff-verified";

      let updatedCloudinaryUrl =
        document.cloudinary_url;

      let updatedCloudinaryAssetId =
        document.cloudinary_asset_id;

      cloudinaryPublicId =
        document.cloudinary_public_id;

      cloudinaryResourceType =
        document.cloudinary_resource_type ||
        "image";

      previousFolder =
        updatedCloudinaryFolder;

      /*
       * Only approved documents are moved into
       * audisure/admin-approved.
       *
       * Rejected documents remain in
       * audisure/staff-verified for audit purposes.
       */
      if (
        normalizedStatus === "approved"
      ) {
        const destinationFolder =
          "audisure/admin-approved";

        const movedAsset =
          await moveCloudinaryAsset({
            publicId:
              cloudinaryPublicId,
            resourceType:
              cloudinaryResourceType,
            destinationFolder,
          });

        cloudinaryMoved = true;

        updatedCloudinaryFolder =
          movedAsset.assetFolder;

        updatedCloudinaryUrl =
          movedAsset.secureUrl ||
          updatedCloudinaryUrl;

        updatedCloudinaryAssetId =
          movedAsset.assetId ||
          updatedCloudinaryAssetId;

        cloudinaryPublicId =
          movedAsset.publicId;

        cloudinaryResourceType =
          movedAsset.resourceType;
      }

      await connection.query(
        `
        UPDATE documents

        SET
          status = ?,
          remarks = ?,

          cloudinary_url = ?,
          cloudinary_public_id = ?,
          cloudinary_asset_id = ?,
          cloudinary_resource_type = ?,
          cloudinary_folder = ?,

          approved_hash = ?,
          approved_by = ?,
          approved_at = ?,
          is_locked = ?,

          updated_at = NOW()

        WHERE document_uid = ?
        `,
        [
          normalizedStatus,
          normalizedRemarks || null,

          updatedCloudinaryUrl,
          cloudinaryPublicId,
          updatedCloudinaryAssetId,
          cloudinaryResourceType,
          updatedCloudinaryFolder,

          normalizedStatus === "approved"
            ? document.document_hash
            : null,
          normalizedStatus === "approved"
            ? changed_by || null
            : null,
          normalizedStatus === "approved"
            ? new Date()
            : null,
          1,

          document_uid,
        ]
      );

      await connection.query(
        `
        INSERT INTO document_history (
          document_uid,
          status,
          remarks,
          changed_by,
          created_at
        )
        VALUES (?, ?, ?, ?, NOW())
        `,
        [
          document_uid,
          normalizedStatus,
          normalizedRemarks || null,
          changed_by || document.user_id,
        ]
      );

      const notification =
        getNotificationContent(
          normalizedStatus,
          document.document_type ||
            document.title,
          normalizedRemarks
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

      return res.json({
        success: true,
        message:
          normalizedStatus === "approved"
            ? "Document approved, locked, and moved to the admin-approved folder."
            : "Document rejected successfully.",

        document_uid,
        previous_status:
          document.previous_status,
        status: normalizedStatus,
        approved_hash:
          normalizedStatus === "approved"
            ? document.document_hash
            : null,
        is_locked: 1,
        cloudinary_folder:
          updatedCloudinaryFolder,
        cloudinary_url:
          updatedCloudinaryUrl,
      });
    } catch (error) {
      await connection.rollback();

      /*
       * If Cloudinary moved successfully but the
       * database transaction failed, attempt to return
       * the asset to its previous folder.
       */
      if (
        cloudinaryMoved &&
        cloudinaryPublicId &&
        previousFolder
      ) {
        try {
          await moveCloudinaryAsset({
            publicId:
              cloudinaryPublicId,
            resourceType:
              cloudinaryResourceType,
            destinationFolder:
              previousFolder,
          });
        } catch (
          compensationError
        ) {
          console.error(
            "ADMIN CLOUDINARY MOVE ROLLBACK ERROR:",
            compensationError
          );
        }
      }

      console.error(
        "ADMIN REVIEW ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to complete the admin review.",
      });
    } finally {
      connection.release();
    }
  }
);

/* ======================================================
   GET DOCUMENT FILES

   GET /api/documents/:document_uid

   This generic route must remain last.
====================================================== */

router.get(
  "/:document_uid",
  async (req, res) => {
    const { document_uid } =
      req.params;

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

      return res.json({
        success: true,
        files: rows,
      });
    } catch (error) {
      console.error(
        "GET DOCUMENT FILES ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.sqlMessage ||
          "Unable to load files.",
      });
    }
  }
);

export default router;