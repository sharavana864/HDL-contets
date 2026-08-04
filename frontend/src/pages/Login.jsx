import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { C3Logo, TopHeaderLogos } from '../components/Logos.jsx';

export default function Login() {
  const [participantId, setParticipantId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const loggedUser = await login(participantId, password);
      if (loggedUser?.role === 'admin' || loggedUser?.role === 'judge') {
        navigate('/admin/active');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="auth-page">
      <TopHeaderLogos height={44} />

      <div style={{ margin: '1.5rem auto 1rem', textAlign: 'center' }}>
        <C3Logo height={56} showSubtitle={true} />
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <h1 style={{ textAlign: 'center', marginBottom: '1.25rem' }}>Sign In to C³ Arena</h1>
        <label>Participant ID
          <input
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            placeholder="e.g. IEICCC001 or RIT_1432"
            required
          />
        </label>
        <label>Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" style={{ fontSize: '1.05rem', fontWeight: 'bold' }}>⚡ Sign In to C³ Arena</button>

        <p className="auth-footer" style={{ marginTop: '1.5rem' }}>No account? <Link to="/register">Register Participant Account</Link></p>
      </form>
    </div>
  );
}
