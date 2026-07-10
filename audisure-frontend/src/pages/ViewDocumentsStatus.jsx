import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/userdashboard-features.css";

export default function ViewStatus() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userId = localStorage.getItem("userId"); // assuming userId is stored after login

  // Use your deployed backend URL
  const BASE_URL = "https://audisure-backend.onrender.com/api";

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchStatuses = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/status`, {
          params: { user_id: userId }, // query param for status.js
        });

        if (!response.data.success)
          throw new Error(response.data.message || "Failed to fetch documents");

        setDocuments(response.data.documents || []);
      } catch (err) {
        console.error("Error fetching status:", err);
        setError(err.message || "Failed to fetch document statuses.");
      } finally {
        setLoading(false);
      }
    };

    fetchStatuses();
  }, [userId]);

  const renderStatus = (status) => {
    switch (status) {
      case "approved":
        return <span className="status approved">Approved</span>;
      case "rejected":
        return <span className="status rejected">Rejected</span>;
      case "needs_editing":
        return <span className="status needs-editing">Needs Editing</span>;
      case "processing":
        return <span className="status processing">Processing</span>;
      case "in_review":
        return <span className="status pending">In Review</span>;
      default:
        return <span className="status pending">Pending</span>;
    }
  };

  if (!userId) return <p>Loading user info...</p>;
  if (loading) return <p>Loading document statuses...</p>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;
  if (documents.length === 0)
    return <p>You haven't uploaded any documents yet.</p>;

  return (
    <div className="page-container">
      <h1 className="feature-header">📄 Document Status</h1>
<p className="feature-description">
  Track the progress of your submitted documents in real time. From pending to approval, you’ll always know the current stage of your application and avoid unnecessary delays or confusion.
</p>

      <div className="table-wrapper">
        <table className="status-table">
          <thead>
            <tr>
              <th>Document UID</th>
              <th>Title</th>
              <th>Uploaded At</th>
              <th>Last Updated</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.document_uid}>
                <td>{doc.document_uid}</td>
                <td>{doc.title}</td>
                <td>{new Date(doc.created_at).toLocaleString()}</td>
                <td>{new Date(doc.updated_at).toLocaleString()}</td>
                <td>{renderStatus(doc.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
