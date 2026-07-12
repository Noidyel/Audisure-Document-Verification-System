import {
  useCallback,
  useEffect,
  useState,
} from "react";

import "../styles/dashboard.css";
import "../styles/documents.css";

export default function Documents() {
  const BASE_URL =
    "https://audisure-document-verification-system.onrender.com/api";

  const adminId = Number.parseInt(
    localStorage.getItem("adminId") ||
      localStorage.getItem("user_id") ||
      "0",
    10
  );

  const [documents, setDocuments] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [statusMessage, setStatusMessage] =
    useState("");

  const [processingUid, setProcessingUid] =
    useState("");

  const fetchDocuments =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${BASE_URL}/documents/pending-admin`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          }
        );

        const data = await response.json();

        if (
          !response.ok ||
          data.success === false
        ) {
          throw new Error(
            data.message ||
              `Unable to load documents (${response.status})`
          );
        }

        const returnedDocuments =
          Array.isArray(data)
            ? data
            : Array.isArray(data.documents)
              ? data.documents
              : [];

        setDocuments(returnedDocuments);
      } catch (requestError) {
        console.error(
          "ADMIN DOCUMENT FETCH ERROR:",
          requestError
        );

        setError(
          requestError.message ||
            "Unable to load documents from the server."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const copyHash = async (hash) => {
    if (!hash) return;

    try {
      await navigator.clipboard.writeText(
        hash
      );

      setStatusMessage(
        "Document hash copied."
      );
    } catch (copyError) {
      console.error(
        "COPY HASH ERROR:",
        copyError
      );

      alert(
        "Unable to copy the document hash."
      );
    }
  };

  const submitAdminReview = async (
    document,
    action
  ) => {
    if (!adminId) {
      alert(
        "Administrator ID is missing. Please log out and log in again."
      );

      return;
    }

    let remarks = "";

    if (action === "approved") {
      const confirmed = window.confirm(
        `Approve document ${document.document_uid}?\n\n` +
          "The document will be moved to the final archive and permanently locked."
      );

      if (!confirmed) return;

      remarks =
        "Document approved after final administrative review.";
    }

    if (action === "rejected") {
      const enteredRemarks = window.prompt(
        "Enter the reason for rejecting this document:"
      );

      if (enteredRemarks === null) {
        return;
      }

      remarks = enteredRemarks.trim();

      if (!remarks) {
        alert(
          "A rejection reason is required."
        );

        return;
      }

      const confirmed = window.confirm(
        "Reject this document and notify the applicant?"
      );

      if (!confirmed) return;
    }

    setProcessingUid(
      document.document_uid
    );

    setStatusMessage("");
    setError("");

    try {
      const response = await fetch(
        `${BASE_URL}/documents/admin-review/${encodeURIComponent(
          document.document_uid
        )}`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            status: action,
            remarks,
            changed_by: adminId,
          }),
        }
      );

      const data = await response.json();

      if (
        !response.ok ||
        data.success !== true
      ) {
        throw new Error(
          data.message ||
            `Final review failed (${response.status})`
        );
      }

      /*
       * Both approved and rejected documents leave
       * the pending-admin queue.
       */
      setDocuments((currentDocuments) =>
        currentDocuments.filter(
          (currentDocument) =>
            currentDocument.document_uid !==
            document.document_uid
        )
      );

      setStatusMessage(
        action === "approved"
          ? `Document ${document.document_uid} was approved and locked.`
          : `Document ${document.document_uid} was rejected.`
      );
    } catch (reviewError) {
      console.error(
        "ADMIN REVIEW ERROR:",
        reviewError
      );

      setError(
        reviewError.message ||
          "Unable to complete final review."
      );
    } finally {
      setProcessingUid("");
    }
  };

  const formatStatus = (status) => {
    const normalizedStatus = String(
      status || "pending_admin"
    )
      .trim()
      .toLowerCase();

    switch (normalizedStatus) {
      case "pending_admin":
        return "Pending Admin Review";

      case "approved":
        return "Approved";

      case "rejected":
        return "Rejected";

      case "needs_revision":
        return "Needs Revision";

      default:
        return normalizedStatus
          .replaceAll("_", " ")
          .split(" ")
          .filter(Boolean)
          .map(
            (word) =>
              word.charAt(0).toUpperCase() +
              word.slice(1)
          )
          .join(" ");
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "N/A";

    const parsedDate =
      new Date(dateValue);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return dateValue;
    }

    return parsedDate.toLocaleString();
  };

  const getDocumentUrl = (document) => {
    return (
      document.cloudinary_url ||
      document.file_path ||
      document.file_url ||
      ""
    );
  };

  return (
    <div className="documents-section">
      <div className="documents-header">
        <div>
          <h2>
            Documents for Final Review
          </h2>

          <p>
            These documents have been
            verified by staff and forwarded
            for administrator review.
          </p>
        </div>

        <button
          type="button"
          className="refresh-btn"
          onClick={fetchDocuments}
          disabled={
            loading ||
            Boolean(processingUid)
          }
        >
          {loading
            ? "Refreshing..."
            : "Refresh"}
        </button>
      </div>

      {statusMessage && (
        <div className="status-message">
          {statusMessage}
        </div>
      )}

      {loading && (
        <p className="documents-message">
          Loading verified documents...
        </p>
      )}

      {!loading && error && (
        <div className="documents-error">
          <p>{error}</p>

          <button
            type="button"
            onClick={fetchDocuments}
          >
            Try Again
          </button>
        </div>
      )}

      {!loading &&
        !error &&
        documents.length === 0 && (
          <div className="documents-empty">
            <h3>
              No documents pending final
              review
            </h3>

            <p>
              Documents verified by staff
              will appear here.
            </p>
          </div>
        )}

      {!loading &&
        !error &&
        documents.length > 0 && (
          <div className="documents-table-wrapper">
            <table className="documents-table">
              <thead>
                <tr>
                  <th>UID</th>
                  <th>Applicant</th>
                  <th>Email</th>
                  <th>
                    Application Type
                  </th>
                  <th>Document</th>
                  <th>Status</th>
                  <th>Staff Remarks</th>
                  <th>Date Submitted</th>
                  <th>Document Hash</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {documents.map(
                  (document) => {
                    const documentUrl =
                      getDocumentUrl(
                        document
                      );

                    const status =
                      document.status ||
                      "pending_admin";

                    const applicantName =
                      document.applicant_name ||
                      "Unknown Applicant";

                    const applicantEmail =
                      document.email ||
                      document.user_email ||
                      "N/A";

                    const applicationType =
                      document.name ||
                      document.document_type ||
                      document.code ||
                      "N/A";

                    const isProcessing =
                      processingUid ===
                      document.document_uid;

                    return (
                      <tr
                        key={
                          document.id ||
                          document.document_uid
                        }
                      >
                        <td>
                          <span
                            className="document-uid"
                            title={
                              document.document_uid ||
                              ""
                            }
                          >
                            {document.document_uid ||
                              "N/A"}
                          </span>
                        </td>

                        <td>
                          {applicantName}
                        </td>

                        <td>
                          {applicantEmail}
                        </td>

                        <td>
                          <div className="document-type">
                            {document.code && (
                              <strong>
                                {
                                  document.code
                                }
                              </strong>
                            )}

                            <span>
                              {
                                applicationType
                              }
                            </span>
                          </div>
                        </td>

                        <td>
                          {documentUrl ? (
                            <a
                              href={
                                documentUrl
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="view-document-link"
                            >
                              View PDF
                            </a>
                          ) : (
                            <span>N/A</span>
                          )}
                        </td>

                        <td>
                          <span
                            className={`document-status status-${String(
                              status
                            )
                              .toLowerCase()
                              .replaceAll(
                                "_",
                                "-"
                              )}`}
                          >
                            {formatStatus(
                              status
                            )}
                          </span>
                        </td>

                        <td>
                          {document.remarks ||
                            "No staff remarks"}
                        </td>

                        <td>
                          {formatDate(
                            document.created_at
                          )}
                        </td>

                        <td>
                          <div className="hash-container">
                            <span
                              title={
                                document.document_hash ||
                                ""
                              }
                            >
                              {document.document_hash
                                ? `${document.document_hash.slice(
                                    0,
                                    12
                                  )}...`
                                : "N/A"}
                            </span>

                            {document.document_hash && (
                              <button
                                type="button"
                                className="copy-btn"
                                onClick={() =>
                                  copyHash(
                                    document.document_hash
                                  )
                                }
                                disabled={
                                  isProcessing
                                }
                              >
                                Copy
                              </button>
                            )}
                          </div>
                        </td>

                        <td>
                          <div
                            className="document-actions"
                            style={{
                              display: "flex",
                              gap: "8px",
                              flexWrap:
                                "wrap",
                            }}
                          >
                            <button
                              type="button"
                              className="approve-btn"
                              disabled={
                                isProcessing
                              }
                              onClick={() =>
                                submitAdminReview(
                                  document,
                                  "approved"
                                )
                              }
                            >
                              {isProcessing
                                ? "Processing..."
                                : "Approve"}
                            </button>

                            <button
                              type="button"
                              className="reject-btn"
                              disabled={
                                isProcessing
                              }
                              onClick={() =>
                                submitAdminReview(
                                  document,
                                  "rejected"
                                )
                              }
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}