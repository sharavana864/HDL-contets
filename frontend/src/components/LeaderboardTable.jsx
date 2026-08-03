export default function LeaderboardTable({ rows }) {
  const getDurationSec = (r) => {
    if (r.duration_seconds !== null && r.duration_seconds !== undefined && !isNaN(r.duration_seconds)) {
      return Number(r.duration_seconds);
    }
    if (r.started_at) {
      const end = r.completed_at ? new Date(r.completed_at).getTime() : Date.now();
      return Math.max(0, (end - new Date(r.started_at).getTime()) / 1000);
    }
    return Infinity;
  };

  const sorted = [...rows].sort((a, b) => {
    const scoreA = Number(a.total_score || 0);
    const scoreB = Number(b.total_score || 0);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return getDurationSec(a) - getDurationSec(b);
  });

  const getRankBadge = (index) => {
    if (index === 0) return '🥇 1';
    if (index === 1) return '🥈 2';
    if (index === 2) return '🥉 3';
    return `#${index + 1}`;
  };

  const formatDuration = (row) => {
    let sec = null;
    if (row.duration_seconds !== null && row.duration_seconds !== undefined && !isNaN(row.duration_seconds)) {
      sec = Number(row.duration_seconds);
    } else if (row.started_at) {
      const end = row.completed_at ? new Date(row.completed_at).getTime() : Date.now();
      sec = Math.max(0, (end - new Date(row.started_at).getTime()) / 1000);
    }

    if (sec === null || isNaN(sec) || !row.started_at) {
      return 'Not Started';
    }

    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const formatted = `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;

    if (row.status === 'completed') {
      return formatted;
    }
    return `${formatted} (In Progress)`;
  };

  return (
    <table className="leaderboard-table">
      <thead>
        <tr>
          <th style={{ width: '80px' }}>Rank</th>
          <th>Participant ID</th>
          <th>Name</th>
          <th>Score</th>
          <th>Status</th>
          <th>Time Taken to Complete</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((row, i) => (
          <tr key={row.participant_id} style={i === 0 ? { background: 'rgba(59, 130, 246, 0.08)' } : {}}>
            <td style={{ fontWeight: 'bold', color: i < 3 ? 'var(--cyan)' : 'var(--text)' }}>
              {getRankBadge(i)}
            </td>
            <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--text-heading)' }}>
              {row.participant_id}
            </td>
            <td style={{ color: 'var(--text-heading)' }}>{row.name}</td>
            <td style={{ fontWeight: 'bold', color: 'var(--accent-hover)', fontSize: '1.05rem' }}>
              {row.total_score || 0} pts
            </td>
            <td>
              <span className={`role-badge ${row.status === 'completed' ? 'role-participant' : 'role-admin'}`}>
                {row.status || 'in_progress'}
              </span>
            </td>
            <td style={{ fontWeight: '600', color: row.status === 'completed' ? 'var(--cyan)' : 'var(--text-muted)' }}>
              {formatDuration(row)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
