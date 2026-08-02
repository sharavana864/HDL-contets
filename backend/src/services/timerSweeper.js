/**
 * Periodically finds problem_attempts whose deadline has passed but which
 * were never submitted, and force-grades them using the last auto-saved
 * draft (or empty code -> automatic fail). This guarantees a participant
 * who lets the clock run out still advances instead of getting stuck.
 * Start this from server.js with startTimerSweeper(), or run it as a
 * separate worker process for horizontal scaling.
 */
import { query, withTransaction } from '../config/db.js';
import { runSubmission } from './compilerService.js';
import { hashCode } from './plagiarismService.js';
import { pointsForVerdict } from './scoringService.js';
import { broadcastLeaderboardUpdate, broadcastSubmissionEvent } from '../sockets/websocket.js';

const SWEEP_INTERVAL_MS = 5000;

export function startTimerSweeper() {
  setInterval(sweepExpiredAttempts, SWEEP_INTERVAL_MS);
}

async function sweepExpiredAttempts() {
  const expired = await query(
    `SELECT pa.*, cr.contest_id, cr.id AS run_id, p.sequence_no, p.difficulty, p.testbench_code,
            p.top_module, cr.user_id, u.participant_id, u.name
     FROM problem_attempts pa
     JOIN contest_runs cr ON cr.id = pa.run_id
     JOIN problems p ON p.id = pa.problem_id
     JOIN users u ON u.id = cr.user_id
     WHERE pa.finished_at IS NULL AND pa.deadline_at < now()`
  );

  for (const row of expired.rows) {
    const code = row.draft_code || '';
    let result = { verdict: 'timeout', testsPassed: 0, testsTotal: 0, log: 'Time limit expired; no valid submission.' };

    if (code.trim()) {
      try {
        result = await runSubmission({
          submissionCode: code,
          testbenchCode: row.testbench_code,
          topModule: row.top_module,
        });
      } catch (e) {
        result.log = `Auto-grade error: ${e.message}`;
      }
    }

    const points = pointsForVerdict(result.verdict, row.difficulty);
    const codeHash = hashCode(code || 'EMPTY');

    const submission = await query(
      `INSERT INTO submissions (attempt_id, user_id, problem_id, code, code_hash, verdict, tests_passed, tests_total, compiler_log, points_awarded, graded_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now()) RETURNING id`,
      [row.id, row.user_id, row.problem_id, code, codeHash, result.verdict, result.testsPassed, result.testsTotal, result.log, points]
    );

    const graded = await withTransaction(async (client) => {
      await client.query(`UPDATE problem_attempts SET finished_at = now() WHERE id = $1`, [row.id]);
      const nextSeq = row.sequence_no + 1;
      const isLast = nextSeq > 5;
      const updated = await client.query(
        `UPDATE contest_runs
         SET total_score = total_score + $1,
             current_problem_seq = $2,
             status = $3::run_status,
             completed_at = CASE WHEN $3 = 'completed' THEN now() ELSE completed_at END
         WHERE id = $4 RETURNING *`,
        [points, isLast ? row.sequence_no : nextSeq, isLast ? 'completed' : 'in_progress', row.run_id]
      );
      return updated.rows[0];
    });

    broadcastSubmissionEvent({
      submissionId: submission.rows[0].id, userId: row.user_id, problemId: row.problem_id, status: result.verdict, points,
    });
    broadcastLeaderboardUpdate(row.contest_id, {
      participantId: row.participant_id, name: row.name, totalScore: graded.total_score, status: graded.status,
    });
  }
}