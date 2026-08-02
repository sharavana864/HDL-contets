import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { C3Logo, RitLogo, IeiLogo, TopHeaderLogos } from '../components/Logos.jsx';

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
      await login(participantId, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  const fillUser = (id, pass) => {
    setParticipantId(id);
    setPassword(pass);
  };

  return (
    <div className="auth-page">
      <TopHeaderLogos height={44} />

      <div style={{ margin: '1.5rem auto 1rem', textAlign: 'center' }}>
        <C3Logo height={56} showSubtitle={true} />
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <h1 style={{ textAlign: 'center', marginBottom: '1.25rem' }}>Participant Sign In</h1>
        <label>Participant ID
          <input
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            placeholder="e.g. iei_2600"
            required
          />
        </label>
        <label>Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="e.g. pass_2600"
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" style={{ fontSize: '1.05rem', fontWeight: 'bold' }}>⚡ Sign In to C³ Arena</button>

        <div style={{ marginTop: '1.25rem', padding: '0.85rem', background: '#0b0f19', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '8px', fontSize: '0.85rem' }}>
          <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', color: '#38bdf8' }}>🔑 Contest Account Credentials:</p>
          <div style={{ color: '#8b9bb4', fontSize: '0.8rem', lineHeight: '1.5' }}>
            <strong>Participants:</strong> <code style={{ color: '#38bdf8' }}>iei_2600</code> to <code style={{ color: '#38bdf8' }}>iei_2620</code> (Pass: <code style={{ color: '#38bdf8' }}>pass_2600</code> to <code style={{ color: '#38bdf8' }}>pass_2620</code>)<br />
            <strong>Admins (4 Accounts):</strong><br />
            1. <code style={{ color: '#c084fc' }}>admin1</code> / <code style={{ color: '#c084fc' }}>admin_pass1</code> (Main Admin)<br />
            2. <code style={{ color: '#c084fc' }}>admin2</code> / <code style={{ color: '#c084fc' }}>admin_pass2</code> (RIT Faculty)<br />
            3. <code style={{ color: '#c084fc' }}>admin3</code> / <code style={{ color: '#c084fc' }}>admin_pass3</code> (IEI Rep)<br />
            4. <code style={{ color: '#c084fc' }}>admin4</code> / <code style={{ color: '#c084fc' }}>admin_pass4</code> (Tech Lead)
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
            <button type="button" style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem', background: '#1e293b', border: '1px solid #3b82f6' }} onClick={() => fillUser('iei_2600', 'pass_2600')}>iei_2600</button>
            <button type="button" style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem', background: '#1e293b', border: '1px solid #3b82f6' }} onClick={() => fillUser('iei_2601', 'pass_2601')}>iei_2601</button>
            <button type="button" style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem', background: '#4c1d95', border: '1px solid #8b5cf6' }} onClick={() => fillUser('admin1', 'admin_pass1')}>Admin 1</button>
            <button type="button" style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem', background: '#4c1d95', border: '1px solid #8b5cf6' }} onClick={() => fillUser('admin2', 'admin_pass2')}>Admin 2</button>
            <button type="button" style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem', background: '#4c1d95', border: '1px solid #8b5cf6' }} onClick={() => fillUser('admin3', 'admin_pass3')}>Admin 3</button>
            <button type="button" style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem', background: '#4c1d95', border: '1px solid #8b5cf6' }} onClick={() => fillUser('admin4', 'admin_pass4')}>Admin 4</button>
          </div>
        </div>
        <p className="auth-footer">No account? <Link to="/register">Register Participant Account</Link></p>
      </form>
    </div>
  );
}
