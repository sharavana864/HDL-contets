import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export function useContestSocket({ contestId, onLeaderboardUpdate, onContestState, isAdmin, onAdminSubmission }) {
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('hdl_token');
    if (!token) return;

    const socket = io(import.meta.env.VITE_WS_URL || window.location.origin, {
      auth: { token },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      if (contestId) socket.emit('leaderboard:subscribe', contestId);
      if (isAdmin) socket.emit('admin:subscribe');
    });

    if (onLeaderboardUpdate) socket.on('leaderboard:update', onLeaderboardUpdate);
    if (onContestState) socket.on('contest:state', onContestState);
    if (onAdminSubmission) socket.on('admin:submission', onAdminSubmission);

    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestId, isAdmin]);

  return socketRef;
}
