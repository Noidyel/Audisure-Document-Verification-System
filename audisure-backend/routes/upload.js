import express from "express";
import crypto from "crypto";
import db from "../db.js";

const router = express.Router();

/* ======================================================
   HELPERS
====================================================== */

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function generateDocumentUid(typeCode) {
  const randomPart = crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase();

  return `${typeCode}-${Date.now()}-${randomPart}`;
}

function validateCloudinaryUrl(urlValue) {
  try {
    const parsedUrl = new URL(urlValue);

    if (parsedUrl.protocol !== "https:") {
      return false;
    }

    /*
      Only allow files hosted by Cloudinary.
      This prevents the backend from downloading arbitrary URLs.
    */
    const allowedHosts = [
      "res.cloudinary.com",
    ];

    return allowedHosts.includes(
      parsedUrl.hostname.toLowerCase()
    );
  } catch {
    return false;
  }
}

async function calculateSha256FromUrl(fileUrl) {
  const response = await fetch(fileUrl, {
    method: "GET",
    headers: {
      Accept: "application/pdf,application/octet-stream,*/*",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Unable to download uploaded document. ` +
        `Cloudinary returned ${response.status}.`
    );
  }

  const contentLength =
    Number(response.headers.get("content-length")) || 0;

  /*
    Optional safety limit: 25 MB.
    Change this if Audisure allows larger PDF uploads.
  */
  const maximumFileSize = 25 * 1024 * 1024;

  if (contentLength > maximumFileSize) {
    throw new Error(
      "The uploaded PDF exceeds the 25 MB server limit."
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  if (fileBuffer.length === 0) {
    throw new Error(
      "The uploaded document is empty."
    );
  }

  if (fileBuffer.length > maximumFileSize) {
    throw new Error(
      "The uploaded PDF exceeds the 25 MB server limit."
    );
  }

  /*
    Basic PDF signature validation.
    Most normal PDFs begin with %PDF-.
  */
  const fileSignature = fileBuffer
    .subarray(0, 5)
    .toString("utf8");

  if (fileSignature !== "%PDF-") {
    throw new Error(
      "The uploaded Cloudinary asset is not a valid PDF document."
    );
  }

  return crypto
    .createHash("sha256")
    .update(fileBuffer)
    .digest("hex");
}

/* ======================================================
   SUBMIT APPLICANT DOCUMENT

   POST /api/upload
====================================================== */
router.post("/", async (req, res) => {
  const {
    user_email,
    document_type_id,
    title,
    cloudinary_url,

    /*
      These values are optional for now.
      Flutter can send them later after the Cloudinary upload
      response is expanded.
    */
    cloudinary_public_id,
    cloudinary_asset_id,
    cloudinary_resource_type,
    cloudinary_folder,
  } = req.body;

  const normalizedEmail =
    normalizeEmail(user_email);

  const normalizedTitle =
    String(title || "").trim();

  const normalizedCloudinaryUrl =
    String(cloudinary_url || "").trim();

  if (
    !normalizedEmail ||
    !document_type_id ||
    !normalizedTitle ||
    !normalizedCloudinaryUrl
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Missing user_email, document_type_id, title, or cloudinary_url.",
    });
  }

  if (
    !validateCloudinaryUrl(
      normalizedCloudinaryUrl
    )
  ) {
    return res.status(400).json({
      success: false,
      message:
        "The document URL must be a valid Cloudinary HTTPS URL.",
    });
  }

  let documentHash;

  try {
    /*
      Generate the trusted fingerprint on the backend.
      Do not accept a document hash from Flutter.
    */
    documentHash =
      await calculateSha256FromUrl(
        normalizedCloudinaryUrl
      );
  } catch (error) {
    console.error(
      "DOCUMENT HASH ERROR:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Unable to verify the uploaded PDF.",
    });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [userRows] =
      await connection.execute(
        `
        SELECT
          id,
          email
        FROM users
        WHERE LOWER(email) = ?
        LIMIT 1
        FOR UPDATE
        `,
        [normalizedEmail]
      );

    if (userRows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message:
          "Applicant account not found.",
      });
    }

    const userId = userRows[0].id;

    const [typeRows] =
      await connection.execute(
        `
        SELECT
          id,
          code,
          name
        FROM document_types
        WHERE id = ?
        LIMIT 1
        `,
        [document_type_id]
      );

    if (typeRows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message:
          "Document type not found.",
      });
    }

    const typeCode =
      String(typeRows[0].code || "DOC")
        .trim()
        .toUpperCase();

    const documentUid =
      generateDocumentUid(typeCode);

    /*
      Prevent the same exact PDF from being submitted twice
      by the same applicant for the same document type while
      an active record already exists.
    */
    const [duplicateRows] =
      await connection.execute(
        `
        SELECT
          id,
          document_uid,
          status
        FROM documents
        WHERE user_id = ?
          AND document_type_id = ?
          AND document_hash = ?
          AND status NOT IN (
            'rejected',
            'cancelled'
          )
        LIMIT 1
        `,
        [
          userId,
          document_type_id,
          documentHash,
        ]
      );

    if (duplicateRows.length > 0) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message:
          "This exact PDF has already been submitted.",
        existing_document_uid:
          duplicateRows[0].document_uid,
        existing_status:
          duplicateRows[0].status,
      });
    }

    const [result] =
      await connection.execute(
        `
        INSERT INTO documents (
          document_uid,
          user_id,
          document_type_id,
          title,

          cloudinary_url,
          cloudinary_public_id,
          cloudinary_asset_id,
          cloudinary_resource_type,
          cloudinary_folder,

          document_hash,
          approved_hash,
          approved_by,
          approved_at,
          is_locked,

          version,
          status,
          remarks,
          created_at,
          updated_at
        )
        VALUES (
          ?, ?, ?, ?,

          ?, ?, ?, ?, ?,

          ?,
          NULL,
          NULL,
          NULL,
          0,

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
          normalizedTitle,

          normalizedCloudinaryUrl,
          cloudinary_public_id || null,
          cloudinary_asset_id || null,
          cloudinary_resource_type ||
            "image",
          cloudinary_folder ||
            "audisure/applicant-submissions",

          documentHash,
        ]
      );

    await connection.execute(
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
      [
        documentUid,
        userId,
      ]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message:
        "Application submitted successfully.",

      document_id:
        result.insertId,

      document_uid:
        documentUid,

      cloudinary_url:
        normalizedCloudinaryUrl,

      document_hash:
        documentHash,

      status:
        "pending_staff",
    });
  } catch (error) {
    await connection.rollback();

    console.error(
      "UPLOAD ROUTE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.sqlMessage ||
        error.message ||
        "Failed to save application.",
    });
  } finally {
    connection.release();
  }
});

export default router;
