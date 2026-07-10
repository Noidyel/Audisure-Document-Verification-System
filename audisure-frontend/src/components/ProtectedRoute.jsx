import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, allowedRoles }) {
  let role = localStorage.getItem('userRole') || '';
  role = role.toLowerCase(); // ensure lowercase
  console.log("ProtectedRoute role:", role, "allowedRoles:", allowedRoles);

  if (!role || !allowedRoles.map(r => r.toLowerCase()).includes(role)) {
    console.log("Redirecting to login");
    return <Navigate to="/login" replace />;
  }

  return children;
}
