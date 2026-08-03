import { query, withTransaction } from '../config/db.js';
import { TIME_MODE_SECONDS } from '../services/scoringService.js';
import { broadcastContestStateChange } from '../sockets/websocket.js';

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

// GET /api/contests - list all contests
export async function listContests(req, res) {
  const result = await query('SELECT * FROM contests ORDER BY created_at DESC');
  res.json({ contests: result.rows });
}

// GET /api/contests/:contestId  — rules/instructions + participant's progress
export async function getContestOverview(req, res) {
  const contestId = await resolveContestId(req.params.contestId);
  const contest = await query('SELECT * FROM contests WHERE id = $1', [contestId]);
  if (contest.rowCount === 0) return res.status(404).json({ error: 'Contest not found' });

  const run = await query(
    `SELECT * FROM contest_runs WHERE contest_id = $1 AND user_id = $2`,
    [contestId, req.user.id]
  );

  res.json({
    contest: contest.rows[0],
    run: run.rows[0] || { status: 'not_started', current_problem_seq: 0, total_score: 0 },
  });
}

// POST /api/contests/:contestId/start — "Start Challenge" button
export async function startChallenge(req, res) {
  const contestId = await resolveContestId(req.params.contestId);
  const contest = await query('SELECT status FROM contests WHERE id = $1', [contestId]);
  if (contest.rowCount === 0) return res.status(404).json({ error: 'Contest not found' });
  if (contest.rows[0].status !== 'running') {
    return res.status(409).json({ error: 'Contest is not currently running' });
  }

  const run = await withTransaction(async (client) => {
    const existing = await client.query(
      'SELECT * FROM contest_runs WHERE contest_id = $1 AND user_id = $2 FOR UPDATE',
      [contestId, req.user.id]
    );
    if (existing.rowCount > 0) {
      if (existing.rows[0].status !== 'not_started') return existing.rows[0]; // idempotent
      const updated = await client.query(
        `UPDATE contest_runs SET status = 'in_progress', current_problem_seq = 1, started_at = now()
         WHERE id = $1 RETURNING *`,
        [existing.rows[0].id]
      );
      return updated.rows[0];
    }
    const inserted = await client.query(
      `INSERT INTO contest_runs (contest_id, user_id, status, current_problem_seq, started_at)
       VALUES ($1, $2, 'in_progress', 1, now()) RETURNING *`,
      [contestId, req.user.id]
    );
    return inserted.rows[0];
  });

  res.json({ run });
}

// GET /api/contests/:contestId/current-problem — serves whichever problem the
// participant's run is currently on; will not reveal future problems or the
// hidden testbench.
export async function getCurrentProblem(req, res) {
  const contestId = await resolveContestId(req.params.contestId);
  let run = await query(
    'SELECT * FROM contest_runs WHERE contest_id = $1 AND user_id = $2',
    [contestId, req.user.id]
  );
  if (run.rowCount === 0 || run.rows[0].status === 'not_started') {
    // Auto-start run if contest is active
    const contest = await query('SELECT status FROM contests WHERE id = $1', [contestId]);
    if (contest.rowCount === 0) return res.status(404).json({ error: 'Contest not found' });
    
    const startedRun = await withTransaction(async (client) => {
      const ins = await client.query(
        `INSERT INTO contest_runs (contest_id, user_id, status, current_problem_seq, started_at)
         VALUES ($1, $2, 'in_progress', 1, now())
         ON CONFLICT (contest_id, user_id) DO UPDATE SET status = 'in_progress', current_problem_seq = COALESCE(contest_runs.current_problem_seq, 1)
         RETURNING *`,
        [contestId, req.user.id]
      );
      return ins.rows[0];
    });
    run = { rowCount: 1, rows: [startedRun] };
  }
  if (run.rows[0].status === 'completed') {
    return res.json({ done: true, runStatus: 'completed', totalScore: run.rows[0].total_score });
  }

  let seq = run.rows[0].current_problem_seq;
  let problem = await query(
    `SELECT id, sequence_no, title, statement_md, difficulty, points, starter_code, top_module
     FROM problems WHERE contest_id = $1 AND sequence_no = $2`,
    [contestId, seq]
  );
  if (problem.rowCount === 0) return res.status(404).json({ error: 'Problem not found' });

  // Has an attempt already been started for this problem?
  let attempt = await query(
    `SELECT * FROM problem_attempts WHERE run_id = $1 AND problem_id = $2`,
    [run.rows[0].id, problem.rows[0].id]
  );

  // Check if attempt deadline has passed
  if (attempt.rowCount > 0 && attempt.rows[0].deadline_at && !attempt.rows[0].finished_at) {
    if (new Date(attempt.rows[0].deadline_at) < new Date()) {
      const nextSeq = seq + 1;
      const isLast = nextSeq > 5;
      await query('UPDATE problem_attempts SET finished_at = now() WHERE id = $1', [attempt.rows[0].id]);
      await query(
        `UPDATE contest_runs
         SET current_problem_seq = $1,
             status = $2::run_status,
             completed_at = CASE WHEN $2 = 'completed' THEN now() ELSE completed_at END
         WHERE id = $3`,
        [isLast ? seq : nextSeq, isLast ? 'completed' : 'in_progress', run.rows[0].id]
      );

      if (isLast) {
        return res.json({ done: true, runStatus: 'completed', totalScore: run.rows[0].total_score });
      }

      seq = nextSeq;
      problem = await query(
        `SELECT id, sequence_no, title, statement_md, difficulty, points, starter_code, top_module
         FROM problems WHERE contest_id = $1 AND sequence_no = $2`,
        [contestId, seq]
      );
      if (problem.rowCount === 0) return res.status(404).json({ error: 'Problem not found' });

      attempt = await query(
        `SELECT * FROM problem_attempts WHERE run_id = $1 AND problem_id = $2`,
        [run.rows[0].id, problem.rows[0].id]
      );
    }
  }

  // Automatically start single 7-minute (420s) timer if not already started
  if (attempt.rowCount === 0) {
    const limitSec = 420; // 7 minutes
    const now = new Date();
    const deadlineAt = new Date(now.getTime() + limitSec * 1000);
    const newAttempt = await query(
      `INSERT INTO problem_attempts (run_id, problem_id, time_mode, time_limit_sec, started_at, deadline_at)
       VALUES ($1, $2, $3, $4, now(), $5)
       RETURNING *`,
      [run.rows[0].id, problem.rows[0].id, 'standard', limitSec, deadlineAt]
    );
    attempt = newAttempt;
  }

  res.json({
    problem: problem.rows[0],
    attempt: attempt.rows[0],
    runStatus: 'in_progress',
  });
}

// POST /api/contests/:contestId/problems/:problemId/time-mode
export async function selectTimeMode(req, res) {
  const contestId = await resolveContestId(req.params.contestId);
  const { problemId } = req.params;
  const timeMode = req.body.timeMode || 'standard';

  let run = await query(
    'SELECT * FROM contest_runs WHERE contest_id = $1 AND user_id = $2',
    [contestId, req.user.id]
  );
  if (run.rowCount === 0 || run.rows[0].status !== 'in_progress') {
    const startedRun = await query(
      `INSERT INTO contest_runs (contest_id, user_id, status, current_problem_seq, started_at)
       VALUES ($1, $2, 'in_progress', 1, now())
       ON CONFLICT (contest_id, user_id) DO UPDATE SET status = 'in_progress'
       RETURNING *`,
      [contestId, req.user.id]
    );
    run = startedRun;
  }

  const existing = await query(
    'SELECT * FROM problem_attempts WHERE run_id = $1 AND problem_id = $2',
    [run.rows[0].id, problemId]
  );
  if (existing.rowCount > 0) {
    return res.status(200).json({ attempt: existing.rows[0] });
  }

  const limitSec = 420; // 7 mins
  const now = new Date();
  const deadlineAt = new Date(now.getTime() + limitSec * 1000);

  const attempt = await query(
    `INSERT INTO problem_attempts (run_id, problem_id, time_mode, time_limit_sec, started_at, deadline_at)
     VALUES ($1, $2, $3, $4, now(), $5)
     RETURNING *`,
    [run.rows[0].id, problemId, timeMode, limitSec, deadlineAt]
  );

  res.status(201).json({ attempt: attempt.rows[0] });
}

// POST /api/contests/:contestId/problems/:problemId/timeout
export async function handleTimeout(req, res) {
  const contestId = await resolveContestId(req.params.contestId);
  const { problemId } = req.params;

  const run = await query(
    'SELECT * FROM contest_runs WHERE contest_id = $1 AND user_id = $2',
    [contestId, req.user.id]
  );
  if (run.rowCount === 0 || run.rows[0].status !== 'in_progress') {
    return res.json({ success: true, expired: true });
  }

  const problem = await query('SELECT sequence_no FROM problems WHERE id = $1', [problemId]);
  if (problem.rowCount === 0) return res.status(404).json({ error: 'Problem not found' });

  const attempt = await query(
    'SELECT * FROM problem_attempts WHERE run_id = $1 AND problem_id = $2',
    [run.rows[0].id, problemId]
  );

  const nextSeq = problem.rows[0].sequence_no + 1;
  const isLast = nextSeq > 5;

  await withTransaction(async (client) => {
    if (attempt.rowCount > 0) {
      await client.query('UPDATE problem_attempts SET finished_at = now() WHERE id = $1', [attempt.rows[0].id]);
    }
    await client.query(
      `UPDATE contest_runs
       SET current_problem_seq = $1,
           status = $2::run_status,
           completed_at = CASE WHEN $2 = 'completed' THEN now() ELSE completed_at END
       WHERE id = $3`,
      [isLast ? problem.rows[0].sequence_no : nextSeq, isLast ? 'completed' : 'in_progress', run.rows[0].id]
    );
  });

  res.json({ success: true, nextSeq: isLast ? null : nextSeq, completed: isLast });
}

// PUT /api/contests/:contestId/problems/:problemId/draft — auto-save
export async function saveDraft(req, res) {
  const contestId = await resolveContestId(req.params.contestId);
  const { problemId } = req.params;
  const { code } = req.body;

  const run = await query(
    'SELECT id FROM contest_runs WHERE contest_id = $1 AND user_id = $2',
    [contestId, req.user.id]
  );
  if (run.rowCount === 0) return res.json({ saved: false });

  const result = await query(
    `UPDATE problem_attempts SET draft_code = $1
     WHERE run_id = $2 AND problem_id = $3 AND finished_at IS NULL
     RETURNING id`,
    [code, run.rows[0].id, problemId]
  );
  if (result.rowCount === 0) return res.json({ saved: false });

  res.json({ saved: true });
}

// Admin: POST /api/contests/:contestId/control  { action: 'start' | 'pause' | 'end' }
export async function controlContest(req, res) {
  const contestId = await resolveContestId(req.params.contestId);
  const { action } = req.body;
  const map = { start: 'running', pause: 'paused', end: 'ended' };
  if (!map[action]) return res.status(400).json({ error: 'action must be start, pause, or end' });

  const result = await query(
    'UPDATE contests SET status = $1 WHERE id = $2 RETURNING *',
    [map[action], contestId]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: 'Contest not found' });

  await query(
    `INSERT INTO audit_log (actor_id, action, details) VALUES ($1, $2, $3)`,
    [req.user.id, `contest:${action}`, JSON.stringify({ contestId })]
  );

  broadcastContestStateChange(contestId, map[action]);
  res.json({ contest: result.rows[0] });
}
