import express from "express";
import db from "../db.js";

const router = express.Router();

/* ======================================================
   GET ALL DOCUMENTS
====================================================== */
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        d.id,
        d.document_uid,
        d.user_id,
        CONCAT(u.first_name,' ',u.last_name) AS applicant_name,
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
      documents: rows
    });

  } catch (err) {

    console.error("GET DOCUMENTS ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch documents."
    });

  }
});

router.get("/:document_uid", async (req, res) => {

  const { document_uid } = req.params;

  try {

    const [rows] = await db.query(

      `
      SELECT

        df.file_name,

        df.cloudinary_url

      FROM document_files df

      JOIN documents d

      ON df.document_id=d.id

      WHERE d.document_uid=?
      `,

      [document_uid]

    );

    res.json({

      success:true,

      files:rows

    });

  }

  catch(err){

    console.error(err);

    res.status(500).json({

      success:false,

      message:"Unable to load files."

    });

  }

});

/* ======================================================
   STAFF REVIEW
====================================================== */
router.put("/review/:document_uid", async (req, res) => {

  const { document_uid } = req.params;

  const { status, remarks } = req.body;

  try {

    await db.query(
      `
      UPDATE documents
      SET
        status=?,
        remarks=?,
        updated_at=NOW()
      WHERE document_uid=?
      `,
      [
        status,
        remarks || null,
        document_uid
      ]
    );

    res.json({
      success: true,
      message: "Document updated successfully."
    });

  } catch (err) {

    console.error("REVIEW ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Failed to update document."
    });

  }

});


/* ======================================================
   GET ADMIN QUEUE
====================================================== */
router.get("/pending-admin", async (req, res) => {

  try {

    const [rows] = await db.query(`
      SELECT

        d.id,
        d.document_uid,

        CONCAT(u.first_name,' ',u.last_name)
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
        d.created_at

      FROM documents d

      JOIN users u
      ON d.user_id=u.id

      JOIN document_types dt
      ON d.document_type_id=dt.id

      WHERE d.status='pending_admin'

      ORDER BY d.created_at DESC
    `);

    res.json({
      success:true,
      documents:rows
    });

  }

  catch(err){

    console.error(err);

    res.status(500).json({
      success:false,
      message:"Failed to load admin queue."
    });

  }

});

export default router;