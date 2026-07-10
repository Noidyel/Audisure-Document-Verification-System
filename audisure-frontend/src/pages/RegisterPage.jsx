import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import "../styles/register.css";

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
  `${process.env.REACT_APP_RENDER_API_URL}/api/auth/register`, {
        firstName,
        lastName,
        email,
        password
      });
      if (res.data.success) {
        navigate('/login');
      } else {
        setError(res.data.message);
      }
    } catch (err) {
      setError('Server error');
    }
  };

  return (
    <div style={{ padding: 50, textAlign: 'center' }}>
      <h1>Register</h1>
      <form onSubmit={handleRegister}>
        <input
          placeholder="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
        /><br /><br />
        <input
          placeholder="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
        /><br /><br />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        /><br /><br />

        <div style={{ position: 'relative', display: 'inline-block' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ paddingRight: 30 }}
          />
          <span
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            {showPassword ? '🙈' : '👁️'}
          </span>
        </div><br /><br />

        <button type="submit">Register</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
