import { useState, useEffect } from "react";
import "../styles/dashboard.css";
import "../styles/documents.css";

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const adminId = parseInt(localStorage.getItem("adminId") || "1");

  // Base URL for deployed backend
  const BASE_URL = "https://audisure-backend.onrender.com/api";

  // Fetch documents
  const fetchDocuments = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BASE_URL}/documents`);
      const data = await res.json();

      if (Array.isArray(data)) {
        const docsWithDefaults = data.map((doc) => ({
          ...doc,
          status: doc.status || "Pending",
          document_hash: doc.document_hash || null,
          file_path: doc.file_path || "#",
          firstName: doc.firstName || "Unknown",
          lastName: doc.lastName || "User",
        }));
        setDocuments(docsWithDefaults);
      } else if (data.success === false) {
        setError(data.message || "Failed to fetch documents");
      }
    } catch (err) {
      console.error(err);
      setError("Error fetching documents from server. Check backend URL or CORS.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Copy hash
  const copyHash = (hash) => {
    if (!hash) return;
    navigator.clipboard
      .writeText(hash)
      .then(() => alert("Document hash copied to clipboard!"))
      .catch(() => alert("Failed to copy the hash. Please copy manually."));
  };

  // Update document status
  const updateStatus = async (docId, action) => {
    try {
      const res = await fetch(`${BASE_URL}/documents/update-status/${docId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action, changed_by: adminId }),
      });

      const data = await res.json();

      if (data.success) {
        setDocuments((prev) =>
          prev.map((doc) =>
            doc.id === docId
              ? { ...doc, status: action.charAt(0).toUpperCase() + action.slice(1) }
              : doc
          )
        );
        setStatusMessage(`✅ Changed status to '${action.charAt(0).toUpperCase() + action.slice(1)}'`);
      } else {
        alert(data.message || "Failed to update status in database");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating status");
    }
  };

  return (
    <div className="documents-section">
      <h2>📂 Documents</h2>

      {loading && <p>Loading documents...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {statusMessage && <div className="status-message">{statusMessage}</div>}

      {!loading && !error && (
        <table className="documents-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>File</th>
              <th>Status</th>
              <th>Uploaded</th>
              <th>Document Hash</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => {
              const status = doc.status || "Pending";
              const fileName = doc.file_path ? doc.file_path.split("/").pop() : "N/A";

              return (
                <tr key={doc.id} className={`doc-row status-${status.toLowerCase()}`}>
                  <td>{doc.id || "N/A"}</td>
                  <td>{doc.firstName} {doc.lastName}</td>
                  <td>
                    {doc.file_path ? (
                      <a href={doc.file_path} target="_blank" rel="noopener noreferrer">
                        {fileName}
                      </a>
                    ) : "N/A"}
                  </td>
                  <td className={`status-${status.toLowerCase()}`}>{status}</td>
                  <td>{doc.created_at ? new Date(doc.created_at).toLocaleString() : "N/A"}</td>
                  <td>
                    <div className="hash-container">
                      <span title={doc.document_hash || ""}>
                        {doc.document_hash ? doc.document_hash.slice(0, 12) + "..." : "N/A"}
                      </span>
                      {doc.document_hash && (
                        <button className="copy-btn" onClick={() => copyHash(doc.document_hash)}>Copy</button>
                      )}
                    </div>
                  </td>
                  <td>
                    {["Approved", "Rejected"].includes(status) ? (
                      <span style={{ color: "gray", cursor: "not-allowed" }}>Approve | Pending | Reject</span>
                    ) : (
                      <>
                        <button className="approve-btn" onClick={() => updateStatus(doc.id, "approved")}>Approve</button>{" "}
                        |{" "}
                        <button className="pending-btn" onClick={() => updateStatus(doc.id, "pending")}>Pending</button>{" "}
                        |{" "}
                        <button className="reject-btn" onClick={() => updateStatus(doc.id, "rejected")}>Reject</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
