import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/userdashboard-features.css";

// Always use deployed backend
const BASE_URL = "https://audisure-backend.onrender.com/api";

export default function ViewTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  const userEmail = localStorage.getItem("userEmail");

  useEffect(() => {
    if (!userEmail) return;

    const fetchTasks = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/tasks/${encodeURIComponent(userEmail)}`);
        setTasks(res.data); // tasks.js returns array directly
      } catch (err) {
        console.error("Fetch tasks error:", err);
        if (err.response) setError(err.response.data.message || "Server Error");
        else if (err.request) setError("No response from server. Check backend URL or CORS.");
        else setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [userEmail]);

  const updateStatus = async (taskId, newStatus) => {
    try {
      const res = await axios.post(`${BASE_URL}/tasks/update`, { task_id: taskId, status: newStatus });
      if (!res.data.success) throw new Error(res.data.message || "Failed to update task");

      setTasks((prev) => prev.map((t) => (t.task_id === taskId ? { ...t, status: newStatus } : t)));
      setSuccessMsg(`Task updated to "${newStatus}" successfully!`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Update status error:", err);
      setError(err.response?.data?.message || err.message);
    }
  };

  const archiveTask = async (taskId) => {
    try {
      const res = await axios.post(`${BASE_URL}/tasks/archive`, { task_id: taskId });
      if (!res.data.success) throw new Error(res.data.message || "Failed to archive task");

      setTasks((prev) => prev.filter((t) => t.task_id !== taskId));
      setSuccessMsg("Task archived successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Archive task error:", err);
      setError(err.response?.data?.message || err.message);
    }
  };

  if (!userEmail) return <p>Loading user info...</p>;
  if (loading) return <p>Loading tasks...</p>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;
  if (tasks.length === 0) return <p>No tasks assigned.</p>;

  return (
    <div className="feature-container" style={{ maxWidth: "800px", margin: "2rem auto" }}>
      <h1 className="feature-header">📝 Your Assigned Tasks</h1>
<p className="feature-description">
  Here you can see all your assigned tasks along with their current status.  
  Update your progress or archive completed tasks to stay organized.
</p>
{successMsg && <p style={{ color: "green" }}>{successMsg}</p>}

      <table className="task-table">
        <thead>
          <tr>
            <th>Task Description</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.task_id}>
              <td>{task.task_description}</td>
              <td>
                <span
                  className={
                    task.status === "To-Do"
                      ? "status pending"
                      : task.status === "In Progress"
                      ? "status in-progress"
                      : "status completed"
                  }
                >
                  {task.status}
                </span>
              </td>
              <td>
                {task.status === "To-Do" && (
                  <button className="btn btn-red" onClick={() => updateStatus(task.task_id, "In Progress")}>
                    In Progress
                  </button>
                )}
                {task.status === "In Progress" && (
                  <button className="btn btn-red" onClick={() => updateStatus(task.task_id, "Completed")}>
                    Completed
                  </button>
                )}
                {task.status === "Completed" && (
                  <>
                    <span>✅ Done </span>
                    <button className="btn btn-red" onClick={() => archiveTask(task.task_id)}>
                      Archive
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
