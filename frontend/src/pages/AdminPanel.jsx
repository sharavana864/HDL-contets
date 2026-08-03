import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios.js';
import { useContestSocket } from '../hooks/useWebSocket.js';

export default function AdminPanel() {
  const { contestId } = useParams();
  const [analytics, setAnalytics] = useState(null);
  const [submissions, setSubmissions] = useState([]);

  const apiBase = import.meta.env.VITE_API_URL || '/api';

  const refresh = () => {
    api.get(`/admin/contests/${contestId}/analytics`).then((r) => setAnalytics(r.data));
    api.get(`/admin/contests/${contestId}/submissions`).then((r) => setSubmissions(r.data.submissions));
  };
  useEffect(refresh, [contestId]);

  useContestSocket({
    contestId,
    isAdmin: true,
    onAdminSubmission: () => refresh(),
  });

  const control = async (action) => {
    await api.post(`/contests/${contestId}/control`, { action });
    refresh();
  };

  const [exporting, setExporting] = useState(false);

  const downloadExport = async (endpoint, filename) => {
    try {
      setExporting(true);
      const res = await api.get(endpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export CSV', err);
      alert('Failed to export CSV file.');
    } finally {
      setExporting(false);
    }
  };

  const formatCompletionTime = (sec) => {
    if (sec === null || sec === undefined || isNaN(sec)) return 'N/A';
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  return (
    <div className="admin-panel">
      <h1>Admin Control Panel</h1>

      <section className="controls">
        <button onClick={() => control('start')}>Start Contest</button>
        <button onClick={() => control('pause')}>Pause Contest</button>
        <button onClick={() => control('end')}>End Contest</button>
        <button
          disabled={exporting}
          onClick={() => downloadExport(`/admin/contests/${contestId}/export/leaderboard.csv`, 'leaderboard.csv')}
          className="export-btn"
        >
          📥 Export Leaderboard CSV
        </button>
        <button
          disabled={exporting}
          onClick={() => downloadExport(`/admin/contests/${contestId}/export/logs.csv`, 'submission-logs.csv')}
          className="export-btn"
        >
          📥 Export Submission Logs CSV
        </button>
      </section>

      {analytics && analytics.summary && (
        <section className="analytics">
          <h2>Analytics</h2>
          <ul>
            <li>Participants: {analytics.summary?.total ?? 0}</li>
            <li>Completed: {analytics.summary?.completed ?? 0}</li>
            <li>In progress: {analytics.summary?.in_progress ?? 0}</li>
            <li>Average score: {Number(analytics.summary?.avg_score || 0).toFixed(1)}</li>
          </ul>
          {analytics.perProblem && (
            <table>
              <thead><tr><th>#</th><th>Problem</th><th>Difficulty</th><th>Passed / Attempts</th></tr></thead>
              <tbody>
                {analytics.perProblem.map((p) => (
                  <tr key={p.sequence_no}>
                    <td>{p.sequence_no}</td><td>{p.title}</td><td>{p.difficulty}</td>
                    <td>{p.passed} / {p.attempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      <section className="live-submissions">
        <h2>Live Submissions Log</h2>
        <table>
          <thead>
            <tr>
              <th>Participant</th>
              <th>Problem</th>
              <th>Verdict</th>
              <th>Tests</th>
              <th>Points</th>
              <th>Completion Time</th>
              <th>Submitted At</th>
            </tr>
          </thead>
          <tbody>
            {(submissions || []).map((s) => (
              <tr key={s.id} className={`row-${s.verdict}`}>
                <td>{s.participant_id} ({s.name})</td>
                <td>{s.problem_title}</td>
                <td>{s.verdict}</td>
                <td>{s.tests_passed}/{s.tests_total}</td>
                <td>{s.points_awarded}</td>
                <td style={{ fontWeight: 'bold', color: 'var(--cyan)' }}>{formatCompletionTime(s.duration_seconds)}</td>
                <td>{new Date(s.submitted_at).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
