import { query, withTransaction } from '../config/db.js';
import { runSubmission } from '../services/compilerService.js';
import { hashCode, checkPlagiarism } from '../services/plagiarismService.js';
import { pointsForVerdict } from '../services/scoringService.js';
import { broadcastLeaderboardUpdate, broadcastSubmissionEvent } from '../sockets/websocket.js';

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

// POST /api/contests/:contestId/problems/:problemId/submit
export async function submitSolution(req, res) {
  const contestId = await resolveContestId(req.params.contestId);
  const { problemId } = req.params;
  const { code } = req.body;
  if (typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ error: 'code is required' });
  }

  let runResult = await query(
    'SELECT * FROM contest_runs WHERE contest_id = $1 AND user_id = $2',
    [contestId, req.user.id]
  );
  if (runResult.rowCount === 0 || runResult.rows[0].status !== 'in_progress') {
    // Auto-start run if needed
    const contest = await query('SELECT status FROM contests WHERE id = $1', [contestId]);
    if (contest.rowCount === 0 || contest.rows[0].status !== 'running') {
      return res.status(400).json({ error: 'Contest is not active' });
    }
    const started = await withTransaction(async (client) => {
      const ins = await client.query(
        `INSERT INTO contest_runs (contest_id, user_id, status, current_problem_seq, started_at)
         VALUES ($1, $2, 'in_progress', 1, now())
         ON CONFLICT (contest_id, user_id) DO UPDATE SET status = 'in_progress'
         RETURNING *`,
        [contestId, req.user.id]
      );
      return ins.rows[0];
    });
    runResult = { rowCount: 1, rows: [started] };
  }
  const run = runResult.rows[0];

  let attemptResult = await query(
    `SELECT * FROM problem_attempts WHERE run_id = $1 AND problem_id = $2`,
    [run.id, problemId]
  );
  if (attemptResult.rowCount === 0) {
    const prob = await query('SELECT sequence_no FROM problems WHERE id = $1', [problemId]);
    const seq = prob.rowCount > 0 ? Number(prob.rows[0].sequence_no) : 1;
    let limitSec = 420;
    if (seq === 1 || seq === 2) limitSec = 480;
    else if (seq === 3 || seq === 4) limitSec = 420;
    else if (seq === 5) limitSec = 900;

    const deadlineAt = new Date(Date.now() + limitSec * 1000);
    const newAttempt = await query(
      `INSERT INTO problem_attempts (run_id, problem_id, time_mode, time_limit_sec, started_at, deadline_at)
       VALUES ($1, $2, 'standard', $3, now(), $4)
       RETURNING *`,
      [run.id, problemId, limitSec, deadlineAt]
    );
    attemptResult = newAttempt;
  }
  const attempt = attemptResult.rows[0];
  if (attempt.finished_at) {
    return res.json({ passed: true, verdict: 'passed', pointsAwarded: 0, message: 'This problem has already been graded and passed' });
  }

  const problemResult = await query('SELECT * FROM problems WHERE id = $1', [problemId]);
  if (problemResult.rowCount === 0) return res.status(404).json({ error: 'Problem not found' });
  const problem = problemResult.rows[0];

  // Check if time expired
  if (attempt.deadline_at && new Date(attempt.deadline_at) < new Date()) {
    // Time expired: finalize attempt with 0 points and move to next problem
    const nextSeq = problem.sequence_no + 1;
    const isLast = nextSeq > 5;
    await withTransaction(async (client) => {
      await client.query(`UPDATE problem_attempts SET finished_at = now() WHERE id = $1`, [attempt.id]);
      await client.query(
        `UPDATE contest_runs
         SET current_problem_seq = $1,
             status = $2::run_status,
             completed_at = CASE WHEN $2 = 'completed' THEN now() ELSE completed_at END
         WHERE id = $3`,
        [isLast ? problem.sequence_no : nextSeq, isLast ? 'completed' : 'in_progress', run.id]
      );
    });
    return res.json({ error: 'Time limit exceeded for this problem', expired: true, verdict: 'time_limit_exceeded', passed: false });
  }

  // 1. Persist a "pending" submission row immediately so admins see it live.
  const codeHash = hashCode(code);
  const pending = await query(
    `INSERT INTO submissions (attempt_id, user_id, problem_id, code, code_hash, verdict)
     VALUES ($1, $2, $3, $4, $5, 'compiling') RETURNING id`,
    [attempt.id, req.user.id, problemId, code, codeHash]
  );
  const submissionId = pending.rows[0].id;
  broadcastSubmissionEvent({ submissionId, userId: req.user.id, problemId, status: 'compiling' });

  // 2. Compile + run against the testbench
  const result = await runSubmission({
    submissionCode: code,
    testbenchCode: problem.testbench_code,
    topModule: problem.top_module,
  });

  const isPassed = result.verdict === 'passed';
  const points = isPassed ? pointsForVerdict('passed', problem.difficulty, problem.sequence_no, problem.points) : 0;

  // 3. Update submission record
  await query(
    `UPDATE submissions SET verdict = $1, tests_passed = $2, tests_total = $3,
       compiler_log = $4, points_awarded = $5, graded_at = now() WHERE id = $6`,
    [result.verdict, result.testsPassed, result.testsTotal, result.log, points, submissionId]
  );

  let updatedRun = run;

  // 4. ONLY advance question and mark attempt finished if submission PASSED
  if (isPassed) {
    updatedRun = await withTransaction(async (client) => {
      await client.query(
        `UPDATE problem_attempts SET finished_at = now() WHERE id = $1`,
        [attempt.id]
      );

      const nextSeq = problem.sequence_no + 1;
      const isLast = nextSeq > 5;
      const resRun = await client.query(
        `UPDATE contest_runs
         SET total_score = total_score + $1,
             current_problem_seq = $2,
             status = $3::run_status,
             completed_at = CASE WHEN $3 = 'completed' THEN now() ELSE completed_at END
         WHERE id = $4 RETURNING *`,
        [points, isLast ? problem.sequence_no : nextSeq, isLast ? 'completed' : 'in_progress', run.id]
      );
      return resRun.rows[0];
    });

    // Fire-and-forget plagiarism check
    checkPlagiarism({ submissionId, problemId, userId: req.user.id, code }).catch((e) =>
      console.error('plagiarism check failed', e)
    );

    let durationSeconds = null;
    if (updatedRun.started_at) {
      const endTime = updatedRun.completed_at ? new Date(updatedRun.completed_at).getTime() : Date.now();
      durationSeconds = Math.max(0, Math.round((endTime - new Date(updatedRun.started_at).getTime()) / 1000));
    }

    broadcastLeaderboardUpdate(contestId, {
      participantId: req.user.participantId,
      name: req.user.name,
      totalScore: updatedRun.total_score,
      status: updatedRun.status,
      startedAt: updatedRun.started_at,
      completedAt: updatedRun.completed_at,
      duration_seconds: durationSeconds,
    });
  }

  broadcastSubmissionEvent({
    submissionId, userId: req.user.id, problemId, status: result.verdict, points,
  });

  res.json({
    verdict: result.verdict,
    passed: isPassed,
    testsPassed: result.testsPassed,
    testsTotal: result.testsTotal,
    pointsAwarded: points,
    log: result.log,
    run: updatedRun,
  });
}
