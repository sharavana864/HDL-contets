import { query } from '../config/db.js';

async function resolveContestId(id) {
  if (!id || id === 'active' || id === 'default') {
    const active = await query("SELECT id FROM contests WHERE status = 'running' ORDER BY created_at DESC LIMIT 1");
    if (active.rowCount > 0) return active.rows[0].id;
    const any = await query("SELECT id FROM contests ORDER BY created_at LIMIT 1");
    if (any.rowCount > 0) return any.rows[0].id;
  }
  const check = await query("SELECT id FROM contests WHERE id = $1", [id]);
  if (check.rowCount === 0) {
    const active = await query("SELECT id FROM contests WHERE status = 'running' ORDER BY created_at DESC LIMIT 1");
    if (active.rowCount > 0) return active.rows[0].id;
    const any = await query("SELECT id FROM contests ORDER BY created_at LIMIT 1");
    if (any.rowCount > 0) return any.rows[0].id;
  }
  return id;
}

// GET /api/contests/:contestId/leaderboard
export async function getLeaderboard(req, res) {
  const contestId = await resolveContestId(req.params.contestId);
  const result = await query(
    `SELECT participant_id, name, total_score, started_at, completed_at,
            CASE WHEN completed_at IS NOT NULL
                 THEN EXTRACT(EPOCH FROM (completed_at - started_at))
                 ELSE NULL END AS duration_seconds,
            status
     FROM leaderboard
     WHERE contest_id = $1`,
    [contestId]
  );
  res.json({ leaderboard: result.rows });
}
