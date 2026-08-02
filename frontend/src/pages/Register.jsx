import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const [form, setForm] = useState({ participantId: '', name: '', password: '' });
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(form.participantId, form.name, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-brand-header">
        <svg className="chip-icon" style={{ width: 42, height: 42 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="6" y="6" width="12" height="12" rx="2" />
          <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>
        <h2>Verilog <span style={{ color: 'var(--cyan)' }}>HDL Arena</span></h2>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <h1>Register Participant</h1>
        <label>Participant ID
          <input value={form.participantId} onChange={update('participantId')} placeholder="e.g. hdl_dev01" required />
        </label>
        <label>Full Name
          <input value={form.name} onChange={update('name')} placeholder="e.g. Alex Rivera" required />
        </label>
        <label>Password (min 8 chars)
          <input type="password" minLength={8} value={form.password} onChange={update('password')} required />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit">⚡ Create Hardware Account</button>
        <p className="auth-footer">Already registered? <Link to="/login">Sign in here</Link></p>
      </form>
    </div>
  );
}
