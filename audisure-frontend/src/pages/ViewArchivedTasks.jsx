import React, { useEffect, useState } from "react";

export default function ViewArchivedTasks({ userEmail }) {
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userEmail) return;

    const fetchArchivedTasks = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/tasks/archived/${userEmail}`);
        if (!res.ok) throw new Error("Failed to fetch archived tasks");
        const data = await res.json();
        setArchivedTasks(data);
      } catch (err) {
        console.error("Fetch archived tasks error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchArchivedTasks();
  }, [userEmail]);

  if (!userEmail) return <p>Loading user info...</p>;
  if (loading) return <p>Loading archived tasks...</p>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;
  if (archivedTasks.length === 0) return <p>No archived tasks.</p>;

  return (
    <div className="container">
      <h2>Archived Tasks</h2>
      <table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "gray", color: "white" }}>
            <th>Task Description</th>
            <th>Status</th>
            <th>Archived At</th>
          </tr>
        </thead>
        <tbody>
          {archivedTasks.map((task) => (
            <tr key={task.id}>
              <td>{task.task_description}</td>
              <td>{task.status}</td>
              <td>{task.archived_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
