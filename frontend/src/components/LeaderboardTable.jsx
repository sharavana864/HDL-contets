export default function LeaderboardTable({ rows }) {
  const sorted = [...rows].sort((a, b) => {
    if (b.total_score !== a.total_score) return b.total_score - a.total_score;
    const da = a.duration_seconds ?? Infinity;
    const db = b.duration_seconds ?? Infinity;
    return da - db;
  });

  const getRankBadge = (index) => {
    if (index === 0) return '🥇 1';
    if (index === 1) return '🥈 2';
    if (index === 2) return '🥉 3';
    return `#${index + 1}`;
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
          <th>Completion Time</th>
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
              {row.total_score} pts
            </td>
            <td>
              <span className={`role-badge ${row.status === 'completed' ? 'role-participant' : 'role-admin'}`}>
                {row.status || 'in_progress'}
              </span>
            </td>
            <td style={{ color: 'var(--text)' }}>
              {(() => {
                if (!row.completed_at) return 'In Progress';
                const d = new Date(row.completed_at);
                return isNaN(d.getTime()) ? 'In Progress' : d.toLocaleTimeString();
              })()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
