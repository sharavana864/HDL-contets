import { useEffect, useState } from 'react';

// Purely a display countdown — the authoritative deadline lives server-side
// (see problem_attempts.deadline_at); this just renders it and warns.
export default function Timer({ deadlineAt, onExpire }) {
  const [remaining, setRemaining] = useState(() => secondsLeft(deadlineAt));

  useEffect(() => {
    const id = setInterval(() => {
      const left = secondsLeft(deadlineAt);
      setRemaining(left);
      if (left <= 0) {
        clearInterval(id);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [deadlineAt, onExpire]);

  const warning = remaining <= 15;
  const mm = String(Math.floor(Math.max(remaining, 0) / 60)).padStart(2, '0');
  const ss = String(Math.max(remaining, 0) % 60).padStart(2, '0');

  return (
    <div className={`timer ${warning ? 'timer-warning' : ''}`}>
      {mm}:{ss} {warning && '⚠ time almost up'}
    </div>
  );
}

function secondsLeft(deadlineAt) {
  if (!deadlineAt) return 0;
  const t = new Date(deadlineAt).getTime();
  if (isNaN(t)) return 0;
  return Math.round((t - Date.now()) / 1000);
}
