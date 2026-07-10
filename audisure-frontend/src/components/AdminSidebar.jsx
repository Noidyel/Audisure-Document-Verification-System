import { LayoutDashboard, Users, FileText, ClipboardList } from "lucide-react";
import "../styles/sidebar.css";

export default function AdminSidebar({ active, onSelectFeature }) {
  // Ensure onSelectFeature exists to prevent errors
  const handleClick = (feature) => {
    if (onSelectFeature) onSelectFeature(feature);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-title">Admin Panel</div>
      <nav>
        <ul>
          <li
            className={`menu-item ${active === "dashboard" ? "active" : ""}`}
            onClick={() => handleClick("dashboard")}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </li>
          <hr className="border-gray-700 my-2" />
          <li
            className={`menu-item ${active === "verify" ? "active" : ""}`}
            onClick={() => handleClick("verify")}
          >
            <Users size={20} />
            <span>Verify</span>
          </li>
          <li
            className={`menu-item ${active === "assign" ? "active" : ""}`}
            onClick={() => handleClick("assign")}
          >
            <ClipboardList size={20} />
            <span>Assign</span>
          </li>
          <li
            className={`menu-item ${active === "documents" ? "active" : ""}`}
            onClick={() => handleClick("documents")}
          >
            <FileText size={20} />
            <span>Documents</span>
          </li>
        </ul>
      </nav>

      <div className="logged-in">
        Logged in as:<br />
        <strong>Admin</strong>
      </div>
    </div>
  );
}
