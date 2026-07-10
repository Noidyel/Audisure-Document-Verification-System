import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/upload_documents.css";
import "../styles/userdashboard-features.css";

const BASE_URL = "http://localhost:5000/api";

export default function UploadAndReviewDocuments() {
  const [reviewDocs, setReviewDocs] = useState([]);
  const [loadingReview, setLoadingReview] = useState(false);
  const [selectedType, setSelectedType] = useState("All");

  // =========================
  // FETCH DOCUMENTS
  // =========================
  const fetchReviewDocs = async () => {
    try {
      setLoadingReview(true);

      const res = await axios.get(`${BASE_URL}/documents`);

      if (res.data.success) {
        setReviewDocs(
  (res.data.documents || []).filter(
    doc => doc.status === "pending_staff"
  )
);
      } else {
        console.error(res.data.message);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReview(false);
    }
  };

  useEffect(() => {
    fetchReviewDocs();
  }, []);

  // =========================
  // VIEW DOCUMENT
  // =========================
  const handleView = async (documentUid) => {
    try {

      const res = await axios.get(
        `${BASE_URL}/documents/${documentUid}`
      );

      if (!res.data.success) {
        alert("Unable to load document.");
        return;
      }

      const files = res.data.files;

      if (!files || files.length === 0) {
        alert("No uploaded files.");
        return;
      }

      files.forEach(file => {
        window.open(file.cloudinary_url, "_blank");
      });

    } catch (err) {
      console.error(err);
      alert("Unable to open document.");
    }
  };

  // =========================
  // VERIFY
  // =========================
  const handleVerify = async (documentUid) => {

    if (!window.confirm("Verify this document?"))
      return;

    try {

      await axios.put(
  `${BASE_URL}/documents/review/${documentUid}`,
  {
    status: "pending_admin",
    remarks: ""
  }
);

      alert("Document verified.");

      fetchReviewDocs();

    } catch (err) {
      console.error(err);
      alert("Verification failed.");
    }
  };

  // =========================
  // NEEDS REVISION
  // =========================
  const handleRevision = async (documentUid) => {

    const remarks = window.prompt(
      "Enter revision remarks:"
    );

    if (!remarks) return;

    try {

      await axios.put(
  `${BASE_URL}/documents/update-status/${documentUid}`,
  {
    status: "needs_revision",
    remarks,
  }
);

      alert("Revision request sent.");

      fetchReviewDocs();

    } catch (err) {
      console.error(err);
      alert("Unable to update document.");
    }
  };

  // =========================
  // GROUP DOCUMENTS
  // =========================

  const groupedDocs = {

    ECC: reviewDocs.filter(
      doc => doc.code === "ECC"
    ),

    WCC: reviewDocs.filter(
      doc => doc.code === "WCC"
    ),

    SHC: reviewDocs.filter(
      doc => doc.code === "SHC"
    )

  };

  const displayedGroups =
    selectedType === "All"
      ? groupedDocs
      : {
          [selectedType]:
            groupedDocs[selectedType]
        };

  // =========================
  // TABLE
  // =========================

  const renderDocTable = (docs, label) => {

    if (!docs || docs.length === 0)
      return <p>No documents for {label}.</p>;

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

          {docs.map(doc => (

            <tr key={doc.document_uid}>

              <td>

                <strong>{doc.applicant_name}</strong>

                <br />

                <small>{doc.user_email}</small>

              </td>

              <td>{doc.document_uid}</td>

              <td>{doc.title}</td>

              <td>{doc.status}</td>

              <td>

                {new Date(
                  doc.created_at
                ).toLocaleString()}

              </td>

              <td>

                <button
                  className="btn btn-blue"
                  onClick={() =>
                    handleView(doc.document_uid)
                  }
                >
                  View
                </button>

                {" "}

                <button
                  className="btn btn-green"
                  onClick={() =>
                    handleVerify(doc.document_uid)
                  }
                >
                  Verify
                </button>

                {" "}

                <button
                  className="btn btn-red"
                  onClick={() =>
                    handleRevision(doc.document_uid)
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
        Review applicant submissions, inspect their uploaded
        requirements, and either verify them or return them
        for revision.
      </p>

      <div className="review-section">

        <h2>Applicant Submissions</h2>

        <div className="filter-dropdown">

          <label htmlFor="docTypeSelect">
            Filter by Application Type:
          </label>

          <select
            id="docTypeSelect"
            value={selectedType}
            onChange={(e) =>
              setSelectedType(e.target.value)
            }
          >
            <option value="All">
              All
            </option>

            <option value="ECC">
              Electrification Clearance (ECC)
            </option>

            <option value="WCC">
              Water Connection Clearance (WCC)
            </option>

            <option value="SHC">
              Socialized Housing Clearance (SHC)
            </option>

          </select>

        </div>

        {loadingReview ? (

          <p>Loading applicant submissions...</p>

        ) : reviewDocs.length === 0 ? (

          <p>No submitted documents found.</p>

        ) : (

          Object.entries(displayedGroups).map(
            ([type, docs]) => (

              <div key={type}>

                <h3>

                  {type === "ECC" &&
                    "Electrification Clearance (ECC)"}

                  {type === "WCC" &&
                    "Water Connection Clearance (WCC)"}

                  {type === "SHC" &&
                    "Socialized Housing Clearance (SHC)"}

                </h3>

                {renderDocTable(docs, type)}

              </div>

            )
          )

        )}

      </div>

    </div>
  );
}