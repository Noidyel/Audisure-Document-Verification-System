import express from "express";
import db from "../db.js"; // MySQL pool

const router = express.Router();

// GET all document types
router.get("/types", async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM document_types");
    res.json(results);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET requirements by document type ID
router.get("/requirements/:typeId", async (req, res) => {
  const { typeId } = req.params;
  try {
    const [results] = await db.query(
      "SELECT id, requirement_name, optional, allow_multiple FROM document_requirements WHERE document_type_id = ?",
      [typeId]
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
