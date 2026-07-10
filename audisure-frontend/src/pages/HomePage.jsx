import React, { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import {
  FaUpload,
  FaSearch,
  FaCheckCircle,
  FaLock,
  FaUserShield,
  FaMobileAlt,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import "../styles/HomePage.css";
import "../styles/LoginModal.css";
import HCDRDLogo from '../assets/HCDRD_logo.png';
import QRCodeImage from '../assets/QR_Code.png';

export default function HomePage() {
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const featuresRef = useRef(null);
  const [featuresVisible, setFeaturesVisible] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post(
        `${process.env.REACT_APP_RENDER_API_URL}/api/auth/login`,
        { email, password }
      );

      if (res.data.success) {
        const user = res.data.user;
        if (!user?.id) {
          setError("Login failed: User ID missing in response.");
          setLoading(false);
          return;
        }

        localStorage.setItem("userId", user.id);
        localStorage.setItem("userEmail", user.email);
        localStorage.setItem("firstName", user.firstName);
        localStorage.setItem("userRole", user.role.toLowerCase());
        localStorage.setItem("token", res.data.token);

        if (user.role.toLowerCase() === "admin") navigate("/admin-dashboard");
        else navigate("/user-dashboard");

        setShowLogin(false);
      } else {
        setError(res.data.message || "Invalid credentials");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Server error or invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  // Scroll-triggered Features Section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setFeaturesVisible(true);
            observer.unobserve(entry.target); // trigger only once
          }
        });
      },
      { threshold: 0.3 }
    );

    if (featuresRef.current) {
      observer.observe(featuresRef.current);
    }

    return () => {
      if (featuresRef.current) observer.unobserve(featuresRef.current);
    };
  }, []);

  return (
    <div className="home-container">
      {/* Hero Section */}
      <header className="hero-header">
        {/* Portal Button */}
        <button
          className="btn-portal hero-btn-top-right"
          onClick={() => setShowLogin(true)}
        >
          Audisure Portal
        </button>

        {/* Centered Logo + Title + Intro */}
        <div className="hero-center-container">
          <div className="hero-logo-title">
            <img src={HCDRDLogo} alt="Audisure Logo" className="logo-img" />
            <h1 className="hero-title">Audisure</h1>
          </div>

          <div className="hero-intro">
            <p className="hero-subtitle">
              Audisure is a Document Management Verification System (DMVS) designed to help the Housing Community Development and Resettlement Department (HCDRD) securely manage, track, and verify important documents.
            </p>
            <p className="hero-description">
              Developed to streamline document submission and approval processes, Audisure ensures that staff, applicants, and administrators can efficiently handle document workflows.
              It minimizes errors, prevents document tampering, and provides transparency for applicants checking their document status.
              By integrating secure storage and real-time tracking, Audisure promotes accountability and enhances overall operational efficiency in community development projects.
            </p>
          </div>
        </div>
      </header>

      {/* QR Code Section */}
      <section className="qr-section section-spacing">
  <h2 className="section-title">Try Our App</h2>
  <div className="qr-container">
    <img src={QRCodeImage} alt="Audisure QR Code" className="qr-img" />
    <p>Scan to download the Audisure mobile app</p>
  </div>
</section>

      {/* Features Section (Scroll-triggered) */}
      <section
  ref={featuresRef}
  className={`features-section section-spacing ${featuresVisible ? "visible" : "hidden"}`}
  style={{ marginTop: '4rem' }}
>
        <h2 className="section-title">Features</h2>
        <div className="features-grid">
          <div className="user-card admin-card">
            <h3>Admin</h3>
            <div className="feature-item">
              <FaUserShield className="feature-icon" /> Document Approval
            </div>
            <div className="feature-item">
              <FaLock className="feature-icon" /> Secure Storage
            </div>
          </div>

          <div className="user-card staff-card">
            <h3>Staff</h3>
            <div className="feature-item">
              <FaUpload className="feature-icon" /> Document Upload
            </div>
            <div className="feature-item">
              <FaCheckCircle className="feature-icon" /> Track Submission
            </div>
          </div>

          <div className="user-card applicant-card">
            <h3>Applicant</h3>
            <div className="feature-item">
              <FaMobileAlt className="feature-icon" /> Check Status
            </div>
            <div className="feature-item">
              <FaSearch className="feature-icon" /> Document History
            </div>
          </div>
        </div>
      </section>

      {/* Login Modal */}
      {showLogin && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button onClick={() => setShowLogin(false)} className="modal-close">✖</button>
            <h2 className="modal-title">Login to Audisure</h2>

            <form className="modal-form" onSubmit={handleLogin}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <span className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>
              <button type="submit" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>

            {error && <p className="error-text">{error}</p>}
            <p className="register-text">
              Don’t have an account yet? <Link to="/register">Register here</Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
