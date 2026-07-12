import React, { useEffect, useState } from "react";
import axios from "axios";

import API_BASE_URL from "../config/apiConfig";
import "../styles/upload_documents.css";
import "../styles/userdashboard-features.css";

const BASE_URL = `${API_BASE_URL}/api`;

export default function UploadAndReviewDocuments() {
  const [reviewDocs, setReviewDocs] = useState([]);
  const [loadingReview, setLoadingReview] = useState(false);
  const [selectedType, setSelectedType] = useState("All");
  const [error, setError] = useState("");

  // =========================
  // FETCH PENDING DOCUMENTS
  // =========================
  const fetchReviewDocs = async () => {
    try {
      setLoadingReview(true);
      setError("");

      const response = await axios.get(`${BASE_URL}/documents`);

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Failed to load documents."
        );
      }

      const pendingDocuments = (
        response.data.documents || []
      ).filter((document) => document.status === "pending_staff");

      setReviewDocs(pendingDocuments);
    } catch (err) {
      console.error("Document fetch error:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load submitted documents."
      );
    } finally {
      setLoadingReview(false);
    }
  };

  useEffect(() => {
    fetchReviewDocs();
  }, []);

  // =========================
  // VIEW CONSOLIDATED PDF
  // =========================
  const handleView = (document) => {
    if (!document.cloudinary_url) {
      window.alert("This submission has no uploaded PDF.");
      return;
    }

    window.open(
      document.cloudinary_url,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // =========================
  // VERIFY FOR ADMIN REVIEW
  // =========================
  const handleVerify = async (documentUid) => {
    const confirmed = window.confirm(
      "Verify this document and forward it to the administrator?"
    );

    if (!confirmed) return;

    try {
      const response = await axios.put(
        `${BASE_URL}/documents/review/${documentUid}`,
        {
          status: "pending_admin",
          remarks: "",
        }
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Verification failed."
        );
      }

      window.alert(
        "Document verified and forwarded to the administrator."
      );

      await fetchReviewDocs();
    } catch (err) {
      console.error("Verification error:", err);

      window.alert(
        err.response?.data?.message ||
          err.message ||
          "Verification failed."
      );
    }
  };

  // =========================
  // RETURN FOR REVISION
  // =========================
  const handleRevision = async (documentUid) => {
    const remarks = window.prompt(
      "Enter the reason this submission needs revision:"
    );

    if (!remarks?.trim()) return;

    try {
      const response = await axios.put(
        `${BASE_URL}/documents/review/${documentUid}`,
        {
          status: "needs_revision",
          remarks: remarks.trim(),
        }
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message ||
            "Unable to submit the revision request."
        );
      }

      window.alert("Revision request submitted.");

      await fetchReviewDocs();
    } catch (err) {
      console.error("Revision request error:", err);

      window.alert(
        err.response?.data?.message ||
          err.message ||
          "Unable to update the document."
      );
    }
  };

  // =========================
  // GROUP BY APPLICATION TYPE
  // =========================
  const groupedDocs = {
    ECC: reviewDocs.filter(
      (document) => document.code === "ECC"
    ),
    WCC: reviewDocs.filter(
      (document) => document.code === "WCC"
    ),
    SHC: reviewDocs.filter(
      (document) => document.code === "SHC"
    ),
  };

  const displayedGroups =
    selectedType === "All"
      ? groupedDocs
      : {
          [selectedType]: groupedDocs[selectedType] || [],
        };

  const renderStatus = (status) => {
    switch (status) {
      case "pending_staff":
        return "Pending Staff Verification";
      case "needs_revision":
        return "Needs Revision";
      case "pending_admin":
        return "Pending Admin Approval";
      case "approved":
        return "Approved";
      case "rejected":
        return "Rejected";
      default:
        return status || "Unknown";
    }
  };

  const renderDocTable = (documents, label) => {
    if (!documents || documents.length === 0) {
      return <p>No documents for {label}.</p>;
    }

    return (
      <table className="review-table">
        <thead>
          <tr>
            <th>Applicant</th>
            <th>Document UID</th>
            <th>Document</th>
            <th>Status</th>
            <th>Submitted</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {documents.map((document) => (
            <tr key={document.document_uid}>
              <td>
                <strong>{document.applicant_name}</strong>
                <br />
                <small>{document.user_email}</small>
              </td>

              <td>{document.document_uid}</td>

              <td>
                <div>{document.title}</div>
                <small>{document.document_type}</small>
              </td>

              <td>{renderStatus(document.status)}</td>

              <td>
                {document.created_at
                  ? new Date(
                      document.created_at
                    ).toLocaleString()
                  : "Unavailable"}
              </td>

              <td>
                <button
                  type="button"
                  className="btn btn-blue"
                  onClick={() => handleView(document)}
                >
                  View PDF
                </button>

                {" "}

                <button
                  type="button"
                  className="btn btn-green"
                  onClick={() =>
                    handleVerify(document.document_uid)
                  }
                >
                  Verify
                </button>

                {" "}

                <button
                  type="button"
                  className="btn btn-red"
                  onClick={() =>
                    handleRevision(document.document_uid)
                  }
                >
                  Needs Revision
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="upload-container">
      <h1 className="feature-header">
        📑 Document Verification Queue
      </h1>

      <p className="feature-description">
        Review consolidated applicant PDFs and either forward
        them to the administrator or return them for revision.
      </p>

      <div className="review-section">
        <div className="filter-dropdown">
          <label htmlFor="docTypeSelect">
            Filter by Application Type:{" "}
          </label>

          <select
            id="docTypeSelect"
            value={selectedType}
            onChange={(event) =>
              setSelectedType(event.target.value)
            }
          >
            <option value="All">All</option>

            <option value="ECC">
              Electrification Clearance (ECC)
            </option>

            <option value="WCC">
              Water Connection Clearance (WCC)
            </option>

            <option value="SHC">
              Socialized Housing / Condominium (SHC)
            </option>
          </select>
        </div>

        {loadingReview ? (
          <p>Loading applicant submissions...</p>
        ) : error ? (
          <p style={{ color: "red" }}>Error: {error}</p>
        ) : reviewDocs.length === 0 ? (
          <p>No pending applicant submissions found.</p>
        ) : (
          Object.entries(displayedGroups).map(
            ([type, documents]) => (
              <div key={type}>
                <h3>
                  {type === "ECC" &&
                    "Electrification Clearance (ECC)"}

                  {type === "WCC" &&
                    "Water Connection Clearance (WCC)"}

                  {type === "SHC" &&
                    "Socialized Housing / Condominium (SHC)"}
                </h3>

                {renderDocTable(documents, type)}
              </div>
            )
          )
        )}
      </div>
    </div>
  );
}