import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import HCDRDLogo from "../assets/HCDRD_logo.png";
import QRCodeImage from "../assets/QR_Code.png";
import API_BASE_URL from "../config/apiConfig";

export default function HomePage() {
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [featuresVisible, setFeaturesVisible] = useState(false);

  const featuresRef = useRef(null);
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/login`,
        {
          email,
          password,
        }
      );

      if (!response.data.success) {
        setError(response.data.message || "Invalid credentials.");
        return;
      }

      const user = response.data.user;

      if (!user?.id) {
        setError("Login failed: User ID is missing in the response.");
        return;
      }

      const userRole = user.role?.toLowerCase();

      if (!userRole) {
        setError("Login failed: User role is missing in the response.");
        return;
      }

      localStorage.setItem("userId", user.id);
      localStorage.setItem("userEmail", user.email || "");
      localStorage.setItem("firstName", user.firstName || "");
      localStorage.setItem("userRole", userRole);
      localStorage.setItem("token", response.data.token || "");

      setShowLogin(false);

      if (userRole === "admin") {
        navigate("/admin-dashboard");
      } else {
        navigate("/user-dashboard");
      }
    } catch (err) {
      console.error("Login error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to connect to the server. Please check your credentials and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const featuresElement = featuresRef.current;

    if (!featuresElement) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setFeaturesVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.3,
      }
    );

    observer.observe(featuresElement);

    return () => {
      observer.unobserve(featuresElement);
      observer.disconnect();
    };
  }, []);

  const closeLoginModal = () => {
    setShowLogin(false);
    setError("");
  };

  return (
    <div className="home-container">
      <header className="hero-header">
        <button
          type="button"
          className="btn-portal hero-btn-top-right"
          onClick={() => setShowLogin(true)}
        >
          Audisure Portal
        </button>

        <div className="hero-center-container">
          <div className="hero-logo-title">
            <img
              src={HCDRDLogo}
              alt="Housing Community Development and Resettlement Department logo"
              className="logo-img"
            />

            <h1 className="hero-title">Audisure</h1>
          </div>

          <div className="hero-intro">
            <p className="hero-subtitle">
              Audisure is a Document Management Verification System designed
              to help the Housing Community Development and Resettlement
              Department securely manage, track, and verify important
              documents.
            </p>

            <p className="hero-description">
              Developed to streamline document submission and approval
              processes, Audisure ensures that staff, applicants, and
              administrators can efficiently handle document workflows. It
              minimizes errors, prevents document tampering, and provides
              transparency for applicants checking their document status. By
              integrating secure storage and real-time tracking, Audisure
              promotes accountability and improves operational efficiency in
              community development projects.
            </p>
          </div>
        </div>
      </header>

      <section className="qr-section section-spacing">
        <h2 className="section-title">Try Our App</h2>

        <div className="qr-container">
          <img
            src={QRCodeImage}
            alt="QR code for downloading the Audisure mobile application"
            className="qr-img"
          />

          <p>Scan to download the Audisure mobile app.</p>
        </div>
      </section>

      <section
        ref={featuresRef}
        className={`features-section section-spacing ${
          featuresVisible ? "visible" : "hidden"
        }`}
        style={{ marginTop: "4rem" }}
      >
        <h2 className="section-title">Features</h2>

        <div className="features-grid">
          <div className="user-card admin-card">
            <h3>Administrator</h3>

            <div className="feature-item">
              <FaUserShield className="feature-icon" aria-hidden="true" />
              Document Approval
            </div>

            <div className="feature-item">
              <FaLock className="feature-icon" aria-hidden="true" />
              Secure Storage
            </div>
          </div>

          <div className="user-card staff-card">
            <h3>Staff</h3>

            <div className="feature-item">
              <FaUpload className="feature-icon" aria-hidden="true" />
              Document Upload
            </div>

            <div className="feature-item">
              <FaCheckCircle className="feature-icon" aria-hidden="true" />
              Track Submission
            </div>
          </div>

          <div className="user-card applicant-card">
            <h3>Applicant</h3>

            <div className="feature-item">
              <FaMobileAlt className="feature-icon" aria-hidden="true" />
              Check Status
            </div>

            <div className="feature-item">
              <FaSearch className="feature-icon" aria-hidden="true" />
              Document History
            </div>
          </div>
        </div>
      </section>

      {showLogin && (
        <div
          className="modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeLoginModal();
            }
          }}
        >
          <div
            className="modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-modal-title"
          >
            <button
              type="button"
              onClick={closeLoginModal}
              className="modal-close"
              aria-label="Close login window"
            >
              ✖
            </button>

            <h2 id="login-modal-title" className="modal-title">
              Login to Audisure
            </h2>

            <form className="modal-form" onSubmit={handleLogin}>
              <input
                type="email"
                name="email"
                placeholder="Email"
                aria-label="Email address"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />

              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  aria-label="Password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword((currentValue) => !currentValue)
                  }
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              <button type="submit" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>

            {error && (
              <p className="error-text" role="alert">
                {error}
              </p>
            )}

            <p className="register-text">
              Don’t have an account yet?{" "}
              <Link to="/register">Register here</Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}