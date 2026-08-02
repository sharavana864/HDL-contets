import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';

// NOTE: contestId would normally come from a "current active contest" API call
// or route param; hardcoded fetch-active-contest logic omitted for brevity.
export default function Dashboard({ contestId }) {
  const { user, logout } = useAuth();
  const [overview, setOverview] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/contests/${contestId}`).then((res) => setOverview(res.data));
  }, [contestId]);

  const startChallenge = async () => {
    await api.post(`/contests/${contest.id || contestId}/start`);
    navigate(`/contest/${contest.id || contestId}`);
  };

  if (!overview) return <div className="loading">Loading dashboard…</div>;

  const { contest, run } = overview;
  const targetContestId = contest?.id || contestId;
  const progressPct = Math.round((run.total_score / 700) * 100);

  return (
    <div className="dashboard">
      <header className="dashboard-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>Welcome, {user?.name}</h1>
          <p style={{ margin: 0, color: 'var(--text)' }}>Hardware Description Language Coding Arena & Verification Suite</p>
        </div>
      </header>

      <section className="rules" style={{ background: '#0b0f19', padding: '1.5rem', borderRadius: '10px', border: '1px solid var(--panel-border)', marginBottom: '1.5rem' }}>
        <h2 style={{ color: 'var(--cyan)', marginTop: 0 }}>⚡ {contest.title}</h2>
        <p style={{ color: 'var(--text-heading)' }}>{contest.description}</p>
        <ul style={{ paddingLeft: '1.2rem', color: 'var(--text)', lineHeight: '1.8' }}>
          <li><strong>5 Verilog Hardware Modules:</strong> 3 Easy (100 pts each) + 2 Medium (200 pts each) — 700 max total points.</li>
          <li><strong>Flexible Synthesis Speed:</strong> Fast Mode (1 min), Standard Mode (3 min), or Relaxed Mode (5 min) per problem.</li>
          <li><strong>Strict Gate Simulation:</strong> Submissions are compiled and run against HDL testbenches for signal accuracy.</li>
          <li><strong>Sequential Verification:</strong> Problems are presented sequentially for immediate hardware verification.</li>
        </ul>
      </section>

      <section className="progress" style={{ background: '#0b0f19', padding: '1.5rem', borderRadius: '10px', border: '1px solid var(--panel-border)', marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>📊 Arena Run Progress</h3>
        <div className="progress-bar"><div style={{ width: `${progressPct}%` }} /></div>
        <p style={{ margin: '0.5rem 0 0 0', fontWeight: 'bold', color: 'var(--text-heading)' }}>
          Score: <span style={{ color: 'var(--cyan)' }}>{run.total_score}</span> / 700 points — Status: <span style={{ color: run.status === 'completed' ? 'var(--pass)' : 'var(--warn)', textTransform: 'uppercase' }}>{run.status.replace('_', ' ')}</span>
        </p>
      </section>

      <div className="actions" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {run.status === 'not_started' && <button onClick={startChallenge}>⚡ Start HDL Challenge</button>}
        {run.status === 'in_progress' && <button onClick={() => navigate(`/contest/${targetContestId}`)}>▶️ Resume Challenge</button>}
        <button onClick={() => navigate(`/leaderboard/${targetContestId}`)} className="export-btn">🏆 View Global Leaderboard</button>
        {(user?.role === 'admin' || user?.role === 'judge') && (
          <button onClick={() => navigate(`/admin/${targetContestId}`)} style={{ background: 'var(--purple)' }}>⚙️ Admin Control Panel</button>
        )}
      </div>
    </div>
  );
}
