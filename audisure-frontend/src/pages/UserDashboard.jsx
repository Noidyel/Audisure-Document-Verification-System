import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/UserSidebar";
import Topbar from "../components/UserTopbar";
import UploadAndReviewDocuments from "./UploadAndReviewDocuments"; // <-- new import
import ViewStatus from "./ViewDocumentsStatus";
import ViewTasks from "./ViewTasks";
import "../styles/dashboard.css";

export default function UserDashboard() {
  const userFirstName = localStorage.getItem("firstName") || "Nigel";
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [activeFeature, setActiveFeature] = useState("dashboard");

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/"; // redirect to HomePage
  };

  const activities = [
    { id: 1, text: "You uploaded a document", time: "5 min ago" },
    { id: 2, text: "Your task was marked in progress", time: "20 min ago" },
    { id: 3, text: "You checked a document status", time: "1 hour ago" },
    { id: 4, text: "Your document was approved", time: "2 hours ago" },
  ];

  const renderContent = () => {
    switch (activeFeature) {
      case "upload":
        return <UploadAndReviewDocuments />;
      case "status":
        return <ViewStatus />;
      case "tasks":
        return <ViewTasks />;
      default:
        return (
          <>
            <div className="card-grid">
              <div className="card card-primary" onClick={() => setActiveFeature("upload")}>
                <strong>📤 Upload</strong>
                <p>
                  Upload and review your documents. This feature allows you to submit files and see the uploaded documents for verification.
                </p>
              </div>

              <div className="card card-secondary" onClick={() => setActiveFeature("status")}>
                <strong>🔍 Status</strong>
                <p>
                  Track the progress of your submitted documents in real time.
                </p>
              </div>

              <div className="card card-neutral" onClick={() => setActiveFeature("tasks")}>
                <strong>📝 View Tasks</strong>
                <p>
                  See all your assigned tasks and their progress.
                </p>
              </div>
            </div>

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
    <div className="user-dashboard-container">
      <Sidebar
        active={activeFeature}
        onHoverChange={setSidebarHovered}
        onSelectFeature={setActiveFeature}
      />
      <Topbar
        userName={userFirstName}
        onLogout={handleLogout}
        sidebarHovered={sidebarHovered}
      />

      <div className={`dashboard-content ${sidebarHovered ? "expanded" : ""}`}>
        {renderContent()}
      </div>
    </div>
  );
}
