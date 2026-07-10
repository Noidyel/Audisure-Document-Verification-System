import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import db from '../db.js';
import { v2 as cloudinary } from 'cloudinary';

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer for temp storage
const upload = multer({ dest: 'uploads/' });

// -----------------------
// Upload Document
// -----------------------
router.post('/upload', upload.single('document'), async (req, res) => {
  try {
    const file = req.file;
    const userId = req.body.userId;

    if (!file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    const allowedExtensions = ['pdf', 'doc', 'docx'];
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ success: false, message: 'Invalid file type.' });
    }

    // Generate SHA256 hash
    const fileBuffer = fs.readFileSync(file.path);
    const documentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Generate unique UID
    const uid = crypto.randomBytes(5).toString('hex').toUpperCase();

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(file.path, {
      resource_type: 'raw',
      public_id: `${file.originalname.split('.')[0]}_${Date.now()}`,
      format: ext,
    });

    const fileUrl = uploadResult.secure_url;

    // Insert document
    await db.query(
      'INSERT INTO documents (user_id, title, file_path, file_type, document_uid, document_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [userId, file.originalname, fileUrl, ext, uid, documentHash]
    );

    // Insert pending status
    await db.query(
      'INSERT INTO documents_statuses (document_uid, status, changed_by) VALUES (?, "pending", ?)',
      [uid, userId]
    );

    // Delete temp file
    fs.unlinkSync(file.path);

    res.json({ success: true, message: 'Document uploaded successfully.', documentUid: uid, fileUrl });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, message: 'Upload failed', error: err.message });
  }
});

// -----------------------
// Get User Documents + Latest Status
// -----------------------
router.get('/documents/:userEmail', async (req, res) => {
  try {
    const { userEmail } = req.params;

    const sql = `
      SELECT d.title, d.created_at,
        (SELECT ds.status 
         FROM documents_statuses ds 
         WHERE ds.document_uid = d.document_uid 
         ORDER BY ds.updated_at DESC 
         LIMIT 1) AS status
      FROM documents d
      JOIN users u ON d.user_id = u.id
      WHERE u.email = ?
      ORDER BY d.created_at DESC
    `;

    const [documents] = await db.query(sql, [userEmail]);
    res.json({ success: true, documents });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch documents' });
  }
});


// -----------------------
// Get User Tasks
// -----------------------
router.get('/tasks/:userEmail', async (req, res) => {
  try {
    const { userEmail } = req.params;
    const [tasks] = await db.query('SELECT * FROM tasks WHERE user_email = ? ORDER BY assigned_at DESC', [userEmail]);
    res.json({ success: true, tasks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch tasks' });
  }
});

export default router;
