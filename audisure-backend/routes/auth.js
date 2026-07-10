import express from 'express';
import db from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// ✅ Normalize email to avoid duplicates
function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

// ========================
// REGISTER
// ========================
router.post('/register', async (req, res) => {

  console.log("Register hit");

  const {

    firstName,

    lastName,

    email,

    password,

    role

  } = req.body;

  const normalizedEmail = normalizeEmail(email);

  try {

    const [existing] = await db.query(

      "SELECT id FROM users WHERE LOWER(email)=?",

      [normalizedEmail]

    );

    if (existing.length > 0) {
      return res.json({
        success: false,
        message: "Email already exists."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Default role
    const userRole = role || "staff";

    // Applicants require approval
    const accountStatus =
      userRole === "applicant"
        ? "pending"
        : "approved";

    const [result] = await db.query(

      `
      INSERT INTO users
      (

        first_name,

        last_name,

        email,

        password,

        role,

        account_status

      )

      VALUES

      (?, ?, ?, ?, ?, ?)
      `,

      [

        firstName,

        lastName,

        normalizedEmail,

        hashedPassword,

        userRole,

        accountStatus

      ]

    );

    res.json({

      success: true,

      userId: result.insertId,

      message: "Registration successful."

    });

  }

  catch (err) {

    console.error(err);

    res.status(500).json({

      success: false,

      message: err.sqlMessage || "Registration failed."

    });

  }

});

// ========================
// LOGIN
// ========================
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);

  try {
    // ✅ Check if user exists
    const [rows] = await db.query(
      'SELECT * FROM users WHERE LOWER(email) = ?',
      [normalizedEmail]
    );

    if (!rows || rows.length === 0) {
      return res.json({ success: false, message: 'Invalid credentials' });
    }

    const user = rows[0];

    // ✅ Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: 'Invalid credentials' });
    }

    // ✅ Generate JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    console.log(`✅ Login successful for: ${user.email} (${user.role})`);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        status: user.account_status,
      },
    });
  } catch (err) {
    console.error('❌ Login error:', err.sqlMessage || err);
    res.status(500).json({
      success: false,
      message: err.sqlMessage || 'Server error during login',
    });
  }
});

export default router;
