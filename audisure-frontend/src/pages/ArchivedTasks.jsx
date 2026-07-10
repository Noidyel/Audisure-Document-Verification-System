import React, { useEffect, useState } from "react";
import "../styles/user_styles.css"; // shared user design theme

export default function ArchivedTasks() {
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userEmail = localStorage.getItem("userEmail");

  useEffect(() => {
    if (!userEmail) return;

    const fetchArchived = async () => {
      try {
        const res = await fetch(
          `https://audisure-fullstack.onrender.com/web/archived_tasks.php?email=${encodeURIComponent(
            userEmail
          )}`
        );
        if (!res.ok) throw new Error("Failed to fetch archived tasks");

        const data = await res.json();
        if (data.success) setArchivedTasks(data.archivedTasks);
        else throw new Error(data.message || "No archived tasks found");
      } catch (err) {
        console.error("Error fetching archived tasks:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchArchived();
  }, [userEmail]);

  if (!userEmail) return <p>Loading user info...</p>;
  if (loading) return <p>Loading archived tasks...</p>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;
  if (archivedTasks.length === 0)
    return (
      <div className="feature-container" style={{ textAlign: "center", marginTop: "2rem" }}>
        <h2 className="page-title">🗂️ Archived Tasks</h2>
        <p className="page-description">No archived tasks available yet.</p>
        <a href="/tasks" className="back-link">← Back to Tasks</a>
      </div>
    );

  return (
    <div
      className="feature-container"
      style={{ maxWidth: "850px", margin: "2rem auto" }}
    >
      <h2 className="page-title">🗂️ Archived Tasks</h2>
      <p className="page-description">
        View your completed or archived tasks for record purposes.
      </p>

      <div className="table-wrapper">
        <table className="task-table">
          <thead>
            <tr>
              <th>Task Description</th>
              <th>Status</th>
              <th>Date Assigned</th>
              <th>Date Archived</th>
            </tr>
          </thead>
          <tbody>
            {archivedTasks.map((task) => (
              <tr key={task.task_id}>
                <td>{task.task_description}</td>
                <td>
                  <span className="status completed">
                    {task.status || "Completed"}
                  </span>
                </td>
                <td>
                  {task.created_at
                    ? new Date(task.created_at).toLocaleString()
                    : "—"}
                </td>
                <td>
                  {task.archived_at
                    ? new Date(task.archived_at).toLocaleString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
        <a href="/tasks" className="back-link">
          ← Back to Tasks
        </a>
      </div>
    </div>
  );
}
