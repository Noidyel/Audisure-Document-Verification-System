import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/user_notifications.css";

export default function UserNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userEmail = localStorage.getItem("userEmail");

  // Base URL for API
  const BASE_URL =
    process.env.NODE_ENV === "development"
      ? "http://localhost:5000/api" // local backend
      : "https://audisure-fullstack.onrender.com/api"; // deployed backend

  useEffect(() => {
    if (!userEmail) {
      setLoading(false);
      return;
    }

    const fetchNotifications = async () => {
      try {
        // Assuming backend expects POST with { email: userEmail }
        const res = await axios.post(`${BASE_URL}/get_notifications`, {
          email: userEmail,
        });

        if (!res.data.success)
          throw new Error(res.data.message || "Failed to fetch notifications");

        setNotifications(res.data.notifications || []);
      } catch (err) {
        console.error("Error fetching notifications:", err);
        setError(err.message || "Failed to fetch notifications.");
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [userEmail, BASE_URL]);

  return (
    <div className="page-container">
      <h1 className="page-title">🔔 Notifications</h1>
      <p className="page-description">
        View all updates and document-related alerts in real time.
      </p>

      {loading ? (
        <p className="loading-text">Loading notifications...</p>
      ) : error ? (
        <p className="error-text" style={{ color: "red" }}>
          Error: {error}
        </p>
      ) : notifications.length === 0 ? (
        <p className="no-notifications">No notifications yet.</p>
      ) : (
        <ul className="notifications-list">
          {notifications.map((notif, index) => (
            <li key={index} className="notification-item">
              <div className="notif-header">
                <span className="notif-title">{notif.title}</span>
                <span className="notif-time">
                  {new Date(notif.created_at).toLocaleString()}
                </span>
              </div>
              <p className="notif-message">{notif.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
