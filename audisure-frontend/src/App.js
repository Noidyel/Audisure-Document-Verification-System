import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import UserDashboard from "./pages/UserDashboard";
import ViewStatus from "./pages/ViewDocumentsStatus";
import UserNotifications from "./pages/UserNotifications";
import AdminDashboard from "./pages/AdminDashboard";
import Verify from "./pages/Verify";
import Assign from "./pages/Assign";
import Documents from "./pages/ViewDocuments";
import ProtectedRoute from "./components/ProtectedRoute";
import UploadAndReviewDocuments from "./pages/UploadAndReviewDocuments";

export default function App() {
  return (
    <Routes>
      {/* Root goes to HomePage */}
      <Route path="/" element={<HomePage />} />

      {/* Login & Register */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* USER DASHBOARD & PAGES */}
      <Route
        path="/user-dashboard"
        element={
          <ProtectedRoute allowedRoles={["staff", "applicant"]}>
            <UserDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user-dashboard/status"
        element={
          <ProtectedRoute allowedRoles={["staff", "applicant"]}>
            <ViewStatus />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user-dashboard/notifications"
        element={
          <ProtectedRoute allowedRoles={["staff", "applicant"]}>
            <UserNotifications />
          </ProtectedRoute>
        }
      />

      {/* ADMIN DASHBOARD & PAGES */}
      <Route
        path="/admin-dashboard"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin-dashboard/verify"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Verify />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin-dashboard/assign"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Assign />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin-dashboard/documents"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Documents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user-dashboard/upload-review"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <UploadAndReviewDocuments />
          </ProtectedRoute>
        }
      />

      {/* Catch-all redirects to home */}
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
}
