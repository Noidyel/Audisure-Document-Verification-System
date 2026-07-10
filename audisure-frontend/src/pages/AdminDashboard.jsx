import React, { useState } from "react";
import AdminSidebar from "../components/AdminSidebar";
import Topbar from "../components/AdminTopbar";
import Verify from "./Verify";
import Assign from "./Assign";
import Documents from "./ViewDocuments";
import "../styles/dashboard.css";

export default function AdminDashboard() {
  const adminFirstName = localStorage.getItem("firstName") || "Admin";
  const [activeFeature, setActiveFeature] = useState("dashboard");

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/home";
  };

  const activities = [
    { id: 1, text: "Applicant uploaded a document", time: "2 min ago" },
    { id: 2, text: "Admin assigned a new task", time: "10 min ago" },
    { id: 3, text: "Applicant checked document status", time: "1 hour ago" },
    { id: 4, text: "Admin approved a document", time: "3 hours ago" },
  ];

  const renderContent = () => {
    switch (activeFeature) {
      case "verify":
        return <Verify />;
      case "assign":
        return <Assign />;
      case "documents":
        return <Documents />;
      default:
        return (
          <>
            {/* Expanded Intro Cards */}
            <div className="card-grid">
              <div
                className="card card-primary"
                onClick={() => setActiveFeature("verify")}
              >
                <strong>👥 Verify</strong>
                <p>
                  Review, approve, or reject new user account requests. This
                  ensures that only authorized applicants and staff gain access
                  to the system, maintaining integrity and security.
                </p>
              </div>

              <div
                className="card card-secondary"
                onClick={() => setActiveFeature("assign")}
              >
                <strong>📝 Assign</strong>
                <p>
                  Create and distribute tasks among staff members to manage
                  document verification efficiently. Helps streamline workflows
                  and ensure accountability.
                </p>
              </div>

              <div
                className="card card-neutral"
                onClick={() => setActiveFeature("documents")}
              >
                <strong>📂 Documents</strong>
                <p>
                  Oversee all uploaded documents to check for completeness,
                  accuracy, and compliance. Organize and take action on
                  submissions easily.
                </p>
              </div>
            </div>

            {/* Recent Activities */}
            <div className="recent-activities">
              <h2>Recent Activities</h2>
              <ul className="activity-list">
                {activities.map((activity) => (
                  <li key={activity.id}>
                    <span className="activity-text">{activity.text}</span>
                    <span className="activity-time">{activity.time}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        );
    }
  };

  return (
    <div className="admin-dashboard-container">
      {/* Sidebar stays static */}
      <AdminSidebar
        active={activeFeature}
        onSelectFeature={(feature) => setActiveFeature(feature)}
      />

      {/* Topbar */}
      <Topbar adminName={adminFirstName} onLogout={handleLogout} />

      {/* Dynamic Dashboard Content */}
      <div className="dashboard-content">{renderContent()}</div>
    </div>
  );
}
