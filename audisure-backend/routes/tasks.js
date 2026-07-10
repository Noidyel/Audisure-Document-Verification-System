// routes/tasks.js
import express from "express";
import db from "../db.js"; // MySQL pool

const router = express.Router();

// ---------------- Active Tasks ---------------- //

// GET: fetch active tasks for a user
router.get("/:email", async (req, res) => {
  const { email } = req.params;
  try {
    const [rows] = await db.execute(
      "SELECT task_id, task_description, status, assigned_at, task_uid FROM tasks WHERE user_email = ? ORDER BY assigned_at DESC",
      [email]
    );
    res.json(rows);
  } catch (err) {
    console.error("Fetch tasks error:", err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// POST: update task status
router.post("/update", async (req, res) => {
  const { task_id, status } = req.body;

  if (!task_id || !status) {
    return res.status(400).json({ error: "Task ID and status are required" });
  }

  try {
    const [result] = await db.execute(
      "UPDATE tasks SET status = ? WHERE task_id = ?",
      [status, task_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json({ success: true, message: "Task status updated successfully" });
  } catch (err) {
    console.error("Update task error:", err);
    res.status(500).json({ error: "Failed to update task" });
  }
});

// POST: archive a completed task
router.post("/archive", async (req, res) => {
  const { task_id } = req.body;

  if (!task_id) {
    return res.status(400).json({ error: "Task ID is required" });
  }

  try {
    // Get task details
    const [rows] = await db.execute(
      "SELECT task_id, user_email, task_description, status FROM tasks WHERE task_id = ?",
      [task_id]
    );

    if (rows.length === 0) return res.status(404).json({ error: "Task not found" });

    const task = rows[0];

    if (task.status !== "Completed") {
      return res.status(400).json({ error: "Only completed tasks can be archived" });
    }

    // Insert into archived_tasks
    await db.execute(
      "INSERT INTO archived_tasks (original_task_id, user_email, task_description, status, archived_at) VALUES (?, ?, ?, ?, NOW())",
      [task.task_id, task.user_email, task.task_description, task.status]
    );

    // Delete from tasks table
    await db.execute("DELETE FROM tasks WHERE task_id = ?", [task.task_id]);

    res.json({ success: true, message: "Task archived successfully" });
  } catch (err) {
    console.error("Archive task error:", err);
    res.status(500).json({ error: "Failed to archive task" });
  }
});

// ---------------- Archived Tasks ---------------- //

// GET: fetch archived tasks for a user
router.get("/archived/:email", async (req, res) => {
  const { email } = req.params;
  try {
    const [rows] = await db.execute(
      "SELECT id, original_task_id, task_description, status, archived_at FROM archived_tasks WHERE user_email = ? ORDER BY archived_at DESC",
      [email]
    );
    res.json(rows);
  } catch (err) {
    console.error("Fetch archived tasks error:", err);
    res.status(500).json({ error: "Failed to fetch archived tasks" });
  }
});

export default router;
