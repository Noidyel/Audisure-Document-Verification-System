import { useEffect, useState } from "react";
import axios from "axios";
import '../styles/dashboard.css';
import "../styles/verify.css";

const BASE_URL = "https://audisure-backend.onrender.com/api";

export default function Verify() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/admin/users`);
        if (res.data.success) setUsers(res.data.users);
        else setError("Failed to fetch users");
      } catch (err) {
        console.error(err);
        setError("Server error");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await axios.put(`${BASE_URL}/admin/users/${id}`, {
        role: "",
        status: newStatus
      });
      if (res.data.success) {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, status: newStatus } : u));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <p>Loading users...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  const admins = users.filter(u => u.role === "admin");
  const staff = users.filter(u => u.role === "user");
  const applicants = users.filter(u => u.role === "applicant");

  const renderTable = (userList, hideStatus = false, hideActions = false) => (
    <div className="table-wrapper" style={{ marginBottom: '30px' }}>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Email</th>
            {!hideStatus && <th>Status</th>}
            {!hideActions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {userList.map(u => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>{u.first_name}</td>
              <td>{u.last_name}</td>
              <td>{u.email}</td>
              {!hideStatus && <td>{u.status || "pending"}</td>}
              {!hideActions && (
                <td>
                  {u.status === "pending" ? (
                    <>
                      <button className="approve-btn" onClick={() => handleStatusChange(u.id, "approved")}>Approve</button>
                      <button className="reject-btn" onClick={() => handleStatusChange(u.id, "rejected")}>Reject</button>
                    </>
                  ) : (
                    <span style={{ color: "gray" }}>No actions</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="dashboard-content" style={{ padding: '20px' }}>
      <h2 className="verify-main-heading">Verify Users</h2>

      <h3 className="verify-subheading">Admins</h3>
      {renderTable(admins)}

      <h3 className="verify-subheading">Staff / Users</h3>
      {renderTable(staff)}

      <h3 className="verify-subheading">Applicants</h3>
      {renderTable(applicants, true, true)} {/* hide status and actions */}
    </div>
  );
}
