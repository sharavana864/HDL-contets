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
    `SELECT u.participant_id, u.name, cr.total_score, cr.started_at, cr.completed_at,
            cr.status,
            CASE
              WHEN cr.completed_at IS NOT NULL AND cr.started_at IS NOT NULL
                THEN ROUND(EXTRACT(EPOCH FROM (cr.completed_at - cr.started_at)))
              WHEN cr.started_at IS NOT NULL
                THEN ROUND(EXTRACT(EPOCH FROM (now() - cr.started_at)))
              ELSE NULL
            END AS duration_seconds
     FROM contest_runs cr
     JOIN users u ON u.id = cr.user_id
     WHERE cr.contest_id = $1
     ORDER BY cr.total_score DESC, duration_seconds ASC NULLS LAST`,
    [contestId]
  );
  res.json({ leaderboard: result.rows });
}
