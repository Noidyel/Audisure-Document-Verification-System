import { useState, useEffect } from "react";
import "../styles/assign.css";

export default function Assign() {
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [customTask, setCustomTask] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const PREDEFINED_TASKS = [
    "Perform Initial Screening",
    "Request Document Re-upload",
    "Verify Documents",
    "Generate Report",
    "Flag Inconsistencies",
  ];

  // Fetch users and recent tasks (last 3 days)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/admin/users");
        const data = await res.json();
        if (data.success) setUsers(data.users);
      } catch (err) {
        console.error(err);
      }
    };

    const fetchRecentTasks = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/admin/tasks/recent");
        const data = await res.json();
        if (data.success) setTasks(data.tasks);
      } catch (err) {
        console.error(err);
      }
    };

    fetchUsers();
    fetchRecentTasks();
  }, []);

  const handleTaskChange = (task) => {
    setSelectedTasks((prev) =>
      prev.includes(task) ? prev.filter((t) => t !== task) : [...prev, task]
    );
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedUser) return setStatusMessage("❌ Please select a user");

    const allTasks = [...selectedTasks];
    if (customTask.trim() !== "") allTasks.push(customTask);
    if (allTasks.length === 0)
      return setStatusMessage("❌ Please select at least one task");

    const newTasks = allTasks.map((task, idx) => ({
      taskUid: `TSK-${String(tasks.length + idx + 1).padStart(3, "0")}`,
      taskDescription: task,
    }));

    try {
      const res = await fetch("http://localhost:5000/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_email: selectedUser, tasks: newTasks }),
      });
      const data = await res.json();

      if (data.success) {
        setStatusMessage("✅ Tasks assigned successfully");

        const refresh = await fetch(
          "http://localhost:5000/api/admin/tasks/recent"
        );
        const refreshedData = await refresh.json();
        if (refreshedData.success) setTasks(refreshedData.tasks);

        setSelectedTasks([]);
        setCustomTask("");
        setSelectedUser("");
      } else setStatusMessage(`❌ ${data.message}`);
    } catch (err) {
      console.error(err);
      setStatusMessage("❌ Server error");
    }
  };

  const handleAction = async (taskId, action) => {
    if (
      (action === "Archive" &&
        !window.confirm("Are you sure you want to archive this task?")) ||
      (action === "Delete" &&
        !window.confirm("Are you sure you want to delete this task?"))
    )
      return;

    try {
      const url = action === "Archive" ? "archive" : "update";
      const body =
        action === "Archive"
          ? { task_id: taskId }
          : { task_id: taskId, status: "Done" };

      const res = await fetch(
        `http://localhost:5000/api/admin/tasks/${url}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();

      if (data.success) {
        setTasks((prev) => prev.filter((t) => t.task_id !== taskId));
        setStatusMessage(`✅ Task ${action}d successfully`);
      } else setStatusMessage(`❌ ${data.message}`);
    } catch (err) {
      console.error(err);
      setStatusMessage("❌ Server error");
    }
  };

  return (
    <div className="assign-container">
      <h2>📝 Assign Tasks</h2>

      {statusMessage && (
        <div
          className={`status-message ${
            statusMessage.includes("❌") ? "status-error" : "status-success"
          }`}
        >
          {statusMessage}
        </div>
      )}

      <form onSubmit={handleAssign} className="assign-form">
        <label>Assign To:</label>
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          required
        >
          <option value="">-- Select User --</option>
          {users.map((u) => (
            <option key={u.email} value={u.email}>
              {u.first_name} {u.last_name} ({u.email})
            </option>
          ))}
        </select>

        <label><strong>Select Tasks:</strong></label>
        <div className="task-checkboxes">
          {PREDEFINED_TASKS.map((task) => (
            <label key={task} className="checkbox-label">
              <input
                type="checkbox"
                value={task}
                checked={selectedTasks.includes(task)}
                onChange={() => handleTaskChange(task)}
              />{" "}
              {task}
            </label>
          ))}
        </div>

        <label><strong>Custom Task:</strong></label>
        <input
          type="text"
          value={customTask}
          placeholder="Enter a custom task..."
          onChange={(e) => setCustomTask(e.target.value)}
        />

        <button type="submit">Assign Task</button>
      </form>

      {tasks.length > 0 && (
        <div className="task-list">
          <h3>Recently Assigned Tasks (Last 3 Days)</h3>
          {tasks.map((t) => (
            <div key={t.task_id || t.task_uid} className="task-item">
              <strong>Task ID: {t.task_uid}</strong>
              <div>{t.task_description}</div>
              <div>Assigned to: {t.user_email}</div>
              <div>
                Status:{" "}
                <span className={`status status-${t.status?.toLowerCase()}`}>
                  {t.status}
                </span>
              </div>
              <div className="action-links">
                <button onClick={() => handleAction(t.task_id, "Edit")}>
                  Edit
                </button>
                <button onClick={() => handleAction(t.task_id, "Archive")}>
                  Archive
                </button>
                {t.status === "Done" && (
                  <button onClick={() => handleAction(t.task_id, "Delete")}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
