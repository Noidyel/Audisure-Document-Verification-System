import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode'; // ✅ named import

export default function useAuth(allowedRoles) {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const decoded = jwtDecode(token);
      if (!allowedRoles.includes(decoded.role)) {
        navigate('/login');
      }
    } catch (err) {
      console.error('Invalid token:', err);
      navigate('/login');
    }
  }, [allowedRoles, navigate]);
}
