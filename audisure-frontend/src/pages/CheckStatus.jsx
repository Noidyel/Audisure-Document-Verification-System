import { useEffect, useState } from "react";
import axios from "axios";
import "../styles/user_styles.css";

export default function CheckStatus() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userId = localStorage.getItem("userId");

  useEffect(() => {
    if (!userId) return setLoading(false);

    const fetchDocuments = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/status/${userId}`);
        if (!response.data.success) throw new Error(response.data.message || "Failed to fetch documents");
        setDocuments(response.data.documents || []);
      } catch (err) {
        console.error("Fetch documents error:", err);
        setError(err.message || "Failed to fetch documents.");
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [userId]);

  const renderStatus = (status) => {
    switch (status) {
      case "approved": return <span className="status completed">Approved</span>;
      case "rejected": return <span className="status pending">Rejected</span>;
      case "needs_editing": return <span className="status pending">Needs Editing</span>;
      case "processing": return <span className="status in-progress">Processing</span>;
      case "in_review": return <span className="status pending">In Review</span>;
      default: return <span className="status pending">Pending</span>;
    }
  };

  if (!userId) return <p>Loading user info...</p>;
  if (loading) return <p>Loading documents...</p>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;
  if (documents.length === 0) return <p>You haven't uploaded any documents yet.</p>;

  return (
    <div className="feature-container">
      <h2>Document Verification Status</h2>
      <table className="task-table">
        <thead>
          <tr>
            <th>Document Title</th>
            <th>Uploaded At</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr key={doc.document_uid || doc.title}>
              <td>{doc.title}</td>
              <td>{new Date(doc.created_at).toLocaleString()}</td>
              <td>{renderStatus(doc.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
