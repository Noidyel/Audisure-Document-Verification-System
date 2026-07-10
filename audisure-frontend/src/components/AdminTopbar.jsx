import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, User } from "lucide-react";
import '../styles/topbar.css';

export default function Topbar({ adminName }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const name = adminName || localStorage.getItem("firstName") || "Admin";

  const toggleDropdown = () => setDropdownOpen(prev => !prev);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogoutClick = () => {
    setShowConfirm(true);
    setDropdownOpen(false);
  };

  const confirmLogout = () => {
    setShowConfirm(false);
    localStorage.clear();
    navigate('/login'); // redirect to login page
  };

  const cancelLogout = () => setShowConfirm(false);

  return (
    <>
      <div className="topbar">
        <h2>Welcome, {name}</h2>
        <div className="actions" ref={dropdownRef}>
          <Bell size={22} />
          <div className="user-dropdown">
            <User size={22} onClick={toggleDropdown} style={{ cursor: 'pointer' }} />
            {dropdownOpen && (
              <div className="user-dropdown-content">
                <button className="logout-btn" onClick={handleLogoutClick}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Logout Confirmation Modal */}
      {showConfirm && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to logout?</p>
            <div className="modal-actions">
              <button className="confirm-btn" onClick={confirmLogout}>Yes</button>
              <button className="cancel-btn" onClick={cancelLogout}>No</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
