import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import "../styles/login.css";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post(
  `${process.env.REACT_APP_RENDER_API_URL}/api/auth/login`,
  { email, password }
);

      if (res.data.success) {
        const user = res.data.user;

        if (!user?.id) {
          setError('Login failed: User ID missing in response.');
          setLoading(false);
          return;
        }

        localStorage.setItem('userId', user.id);
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('firstName', user.firstName);
        localStorage.setItem('userRole', user.role.toLowerCase());
        localStorage.setItem('token', res.data.token);

        if (user.role.toLowerCase() === 'admin') navigate('/admin-dashboard');
        else navigate('/user-dashboard');
      } else {
        setError(res.data.message || 'Invalid credentials');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Server error or invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        padding: '1rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          textAlign: 'center',
          boxSizing: 'border-box',
        }}
      >
        <h1 style={{ marginBottom: '1rem', color: '#dc3545' }}>Audisure</h1>
        <p style={{ marginBottom: '1.5rem', color: '#555', fontSize: '0.95rem' }}>
          Login to manage or check your documents
        </p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '5px',
              border: '1px solid #ccc',
              width: '100%',
              boxSizing: 'border-box'
            }}
          />

          <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '5px',
                border: '1px solid #ccc',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                cursor: 'pointer',
                userSelect: 'none',
                fontSize: '0.9rem',
              }}
            >
              {showPassword ? '🙈' : '👁️'}
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.7rem 1rem',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem',
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {error && (
          <p style={{ color: 'red', marginTop: '1rem', wordBreak: 'break-word' }}>
            {error}
          </p>
        )}

        <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: '#555' }}>
          Don't have an account yet?{' '}
          <Link to="/register" style={{ color: '#dc3545', fontWeight: 'bold', textDecoration: 'none' }}>
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
