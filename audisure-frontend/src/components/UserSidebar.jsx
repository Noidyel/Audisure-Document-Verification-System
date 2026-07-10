import { FaTachometerAlt, FaUpload, FaCheckCircle, FaTasks } from "react-icons/fa"; // <-- FaBell → FaTasks

export default function UserSidebar({ active = "dashboard", onHoverChange, onSelectFeature }) {
  return (
    <div
      className="sidebar"
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    >
      <div className="sidebar-title">User Panel</div>

      <nav>
        <ul>
          <li
            className={`menu-item ${active === "dashboard" ? "active" : ""}`}
            onClick={() => onSelectFeature("dashboard")}
          >
            <FaTachometerAlt size={20} />
            <span>Dashboard</span>
          </li>

          <li
            className={`menu-item ${active === "upload" ? "active" : ""}`}
            onClick={() => onSelectFeature("upload")}
          >
            <FaUpload size={20} />
            <span>Upload</span>
          </li>

          <li
            className={`menu-item ${active === "status" ? "active" : ""}`}
            onClick={() => onSelectFeature("status")}
          >
            <FaCheckCircle size={20} />
            <span>Check Status</span>
          </li>

          <li
            className={`menu-item ${active === "tasks" ? "active" : ""}`} // <-- changed from "notifications"
            onClick={() => onSelectFeature("tasks")} // <-- changed from "notifications"
          >
            <FaTasks size={20} /> {/* <-- changed icon */}
            <span>Tasks</span> {/* <-- changed label */}
          </li>
        </ul>
      </nav>

      <div className="logged-in">
        Logged in as:<br /><strong>User</strong>
      </div>
    </div>
  );
}
