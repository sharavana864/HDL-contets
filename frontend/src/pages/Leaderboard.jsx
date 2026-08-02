import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios.js';
import LeaderboardTable from '../components/LeaderboardTable.jsx';
import { useContestSocket } from '../hooks/useWebSocket.js';

export default function Leaderboard() {
  const { contestId } = useParams();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get(`/contests/${contestId}/leaderboard`).then((res) => setRows(res.data.leaderboard));
  }, [contestId]);

  // Live updates: merge each incoming delta into local state instead of refetching.
  useContestSocket({
    contestId,
    onLeaderboardUpdate: (update) => {
      setRows((prev) => {
        const idx = prev.findIndex((r) => r.participant_id === update.participantId);
        const merged = { ...prev[idx], total_score: update.totalScore, status: update.status, name: update.name, participant_id: update.participantId };
        if (idx === -1) return [...prev, merged];
        const copy = [...prev]; copy[idx] = merged; return copy;
      });
    },
  });

  return (
    <div className="leaderboard-page">
      <h1>Live Leaderboard</h1>
      <LeaderboardTable rows={rows} />
    </div>
  );
}
