import express from "express";
import db from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

/* ======================================================
   HELPERS
====================================================== */

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

/* ======================================================
   REGISTER

   POST /api/auth/register
====================================================== */
router.post("/register", async (req, res) => {
  console.log("Register hit");

  const {
    firstName,
    lastName,
    email,
    password,
    role,
  } = req.body;

  const normalizedEmail = normalizeEmail(email);

  if (
    !firstName?.trim() ||
    !lastName?.trim() ||
    !normalizedEmail ||
    !password
  ) {
    return res.status(400).json({
      success: false,
      message:
        "First name, last name, email, and password are required.",
    });
  }

  try {
    const [existing] = await db.query(
      `
      SELECT id
      FROM users
      WHERE LOWER(email) = ?
      LIMIT 1
      `,
      [normalizedEmail]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    /*
      Keep your current default role behavior.
      You may change "staff" to "applicant" later if public
      registration should always create applicant accounts.
    */
    const userRole = role || "staff";

    const accountStatus =
      userRole === "applicant"
        ? "pending"
        : "approved";

    const [result] = await db.query(
      `
      INSERT INTO users (
        first_name,
        last_name,
        email,
        password,
        role,
        account_status
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        firstName.trim(),
        lastName.trim(),
        normalizedEmail,
        hashedPassword,
        userRole,
        accountStatus,
      ]
    );

    res.status(201).json({
      success: true,
      userId: result.insertId,
      message: "Registration successful.",
    });
  } catch (err) {
    console.error(
      "REGISTER ERROR:",
      err.sqlMessage || err
    );

    res.status(500).json({
      success: false,
      message:
        err.sqlMessage || "Registration failed.",
    });
  }
});

/* ======================================================
   LOGIN

   POST /api/auth/login
====================================================== */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required.",
    });
  }

  try {
    const [rows] = await db.query(
      `
      SELECT
        id,
        first_name,
        last_name,
        email,
        password,
        role,
        account_status,
        created_at
      FROM users
      WHERE LOWER(email) = ?
      LIMIT 1
      `,
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing.");

      return res.status(500).json({
        success: false,
        message: "Server authentication is not configured.",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    console.log(
      `Login successful for: ${user.email} (${user.role})`
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,

        /*
          Return both snake_case and camelCase temporarily.
          This keeps older Flutter code compatible while the
          app transitions to the newer field names.
        */
        first_name: user.first_name,
        last_name: user.last_name,
        firstName: user.first_name,
        lastName: user.last_name,

        email: user.email,
        role: user.role,

        status: user.account_status,
        account_status: user.account_status,
      },
    });
  } catch (err) {
    console.error(
      "LOGIN ERROR:",
      err.sqlMessage || err
    );

    res.status(500).json({
      success: false,
      message:
        err.sqlMessage ||
        "Server error during login.",
    });
  }
});

/* ======================================================
   GET USER PROFILE BY EMAIL

   GET /api/auth/profile/:email
====================================================== */
router.get("/profile/:email", async (req, res) => {
  const normalizedEmail =
      normalizeEmail(req.params.email);

  if (!normalizedEmail) {
    return res.status(400).json({
      success: false,
      message: "Email is required.",
    });
  }

  try {
    const [rows] = await db.query(
      `
      SELECT
        id,
        first_name,
        last_name,
        email,
        role,
        account_status,
        created_at
      FROM users
      WHERE LOWER(email) = ?
      LIMIT 1
      `,
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const user = rows[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,

        /*
          The Flutter profile screen expects "status".
        */
        status: user.account_status,
        account_status: user.account_status,

        created_at: user.created_at,
      },
    });
  } catch (err) {
    console.error(
      "GET PROFILE ERROR:",
      err.sqlMessage || err
    );

    res.status(500).json({
      success: false,
      message:
        err.sqlMessage ||
        "Failed to retrieve user profile.",
    });
  }
});

export default router;