import express from 'express';
import db from '../db.js'; // your MySQL connection
const router = express.Router();

/**
 * ✅ Get all users (admins, staff, applicants)
 */
router.get('/users', async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, first_name, last_name, email, role, status FROM users'
    );
    res.json({ success: true, users });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * ✅ Update user role or status
 */
router.put('/users/:id', async (req, res) => {
  const { role, status } = req.body;
  const { id } = req.params;

  try {
    const [result] = await db.query(
      'UPDATE users SET role = ?, status = ? WHERE id = ?',
      [role || null, status || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * ✅ Get all non-empty tasks
 */
router.get('/tasks', async (req, res) => {
  try {
    const [tasks] = await db.query(
      `SELECT task_id, task_uid, task_description, user_email, status, assigned_at
       FROM tasks
       WHERE task_description IS NOT NULL 
         AND task_description <> '' 
         AND user_email IS NOT NULL 
         AND user_email <> ''
       ORDER BY assigned_at DESC`
    );
    res.json({ success: true, tasks });
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * ✅ Get recently assigned tasks (last 3 days only)
 */
router.get('/tasks/recent', async (req, res) => {
  try {
    const [recentTasks] = await db.query(
      `SELECT task_id, task_uid, task_description, user_email, status, assigned_at
       FROM tasks
       WHERE assigned_at >= NOW() - INTERVAL 3 DAY
         AND task_description IS NOT NULL
         AND task_description <> ''
         AND user_email IS NOT NULL
         AND user_email <> ''
       ORDER BY assigned_at DESC`
    );
    res.json({ success: true, tasks: recentTasks });
  } catch (err) {
    console.error('Error fetching recent tasks:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * ✅ Assign tasks to a user
 */
router.post('/tasks', async (req, res) => {
  const { user_email, tasks } = req.body;
  if (!user_email || !tasks || !tasks.length) {
    return res
      .status(400)
      .json({ success: false, message: 'User email and tasks required' });
  }

  try {
    const insertValues = tasks.map(task => [
      task.taskUid,
      task.taskDescription,
      user_email,
      'To-Do',
      new Date()
    ]);

    await db.query(
      'INSERT INTO tasks (task_uid, task_description, user_email, status, assigned_at) VALUES ?',
      [insertValues]
    );

    res.json({ success: true, message: 'Tasks assigned successfully' });
  } catch (err) {
    console.error('Error assigning tasks:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * ✅ Update task status
 */
router.post('/tasks/update', async (req, res) => {
  const { task_id, status } = req.body;
  if (!task_id || !status) {
    return res
      .status(400)
      .json({ success: false, message: 'Task ID and status required' });
  }

  try {
    await db.query('UPDATE tasks SET status = ? WHERE task_id = ?', [
      status,
      task_id
    ]);
    res.json({ success: true, message: 'Task updated successfully' });
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * ✅ Archive a task (delete for now)
 */
router.post('/tasks/archive', async (req, res) => {
  const { task_id } = req.body;
  if (!task_id) {
    return res
      .status(400)
      .json({ success: false, message: 'Task ID required' });
  }

  try {
    await db.query('DELETE FROM tasks WHERE task_id = ?', [task_id]);
    res.json({ success: true, message: 'Task archived successfully' });
  } catch (err) {
    console.error('Error archiving task:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
