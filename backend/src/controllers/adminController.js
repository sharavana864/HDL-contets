import { query } from '../config/db.js';
import { Parser as CsvParser } from 'json2csv';

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

// GET /api/admin/contests/:contestId/analytics
export async function getAnalytics(req, res) {
  const contestId = await resolveContestId(req.params.contestId);

  const participants = await query(
    `SELECT count(*) AS total,
            count(*) FILTER (WHERE status = 'completed') AS completed,
            count(*) FILTER (WHERE status = 'in_progress') AS in_progress,
            avg(total_score) FILTER (WHERE status = 'completed') AS avg_score
     FROM contest_runs WHERE contest_id = $1`,
    [contestId]
  );

  const perProblem = await query(
    `SELECT p.sequence_no, p.title, p.difficulty,
            count(s.*) FILTER (WHERE s.verdict = 'passed') AS passed,
            count(s.*) AS attempts
     FROM problems p
     LEFT JOIN submissions s ON s.problem_id = p.id
     WHERE p.contest_id = $1
     GROUP BY p.id ORDER BY p.sequence_no`,
    [contestId]
  );

  res.json({
    summary: participants.rows[0],
    perProblem: perProblem.rows,
  });
}

// GET /api/admin/contests/:contestId/submissions — live monitoring feed
export async function listSubmissions(req, res) {
  const contestId = await resolveContestId(req.params.contestId);
  const result = await query(
    `SELECT s.id, u.participant_id, u.name, p.title AS problem_title, s.verdict,
            s.tests_passed, s.tests_total, s.points_awarded, s.submitted_at,
            pa.started_at AS attempt_started_at,
            CASE
              WHEN pa.started_at IS NOT NULL THEN ROUND(EXTRACT(EPOCH FROM (s.submitted_at - pa.started_at)))
              ELSE NULL
            END AS duration_seconds
     FROM submissions s
     JOIN users u ON u.id = s.user_id
     JOIN problems p ON p.id = s.problem_id
     LEFT JOIN problem_attempts pa ON pa.id = s.attempt_id
     WHERE p.contest_id = $1
     ORDER BY s.submitted_at DESC LIMIT 200`,
    [contestId]
  );
  res.json({ submissions: result.rows });
}

// GET /api/admin/contests/:contestId/submissions/:submissionId/log
export async function getSubmissionLog(req, res) {
  const { submissionId } = req.params;
  const result = await query(
    'SELECT id, code, compiler_log, verdict FROM submissions WHERE id = $1',
    [submissionId]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
  res.json(result.rows[0]);
}

// POST /api/admin/problems  — add
export async function createProblem(req, res) {
  const { contestId, sequenceNo, title, statementMd, difficulty, points, starterCode, testbenchCode, topModule } = req.body;
  const result = await query(
    `INSERT INTO problems (contest_id, sequence_no, title, statement_md, difficulty, points, starter_code, testbench_code, top_module)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [contestId, sequenceNo, title, statementMd, difficulty, points, starterCode || '', testbenchCode, topModule]
  );
  res.status(201).json({ problem: result.rows[0] });
}

// PUT /api/admin/problems/:id — edit
export async function updateProblem(req, res) {
  const { id } = req.params;
  const fields = ['title', 'statement_md', 'difficulty', 'points', 'starter_code', 'testbench_code', 'top_module'];
  const updates = [];
  const values = [];
  fields.forEach((f) => {
    const camel = f.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (req.body[camel] !== undefined) {
      values.push(req.body[camel]);
      updates.push(`${f} = $${values.length}`);
    }
  });
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
  values.push(id);
  const result = await query(
    `UPDATE problems SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );
  if (result.rowCount === 0) return res.status(404).json({ error: 'Problem not found' });
  res.json({ problem: result.rows[0] });
}

// DELETE /api/admin/problems/:id
export async function deleteProblem(req, res) {
  const { id } = req.params;
  await query('DELETE FROM problems WHERE id = $1', [id]);
  res.status(204).send();
}

// POST /api/admin/runs/:runId/adjust  — judge bonus/penalty
export async function adjustScore(req, res) {
  const { runId } = req.params;
  const { delta, reason } = req.body;
  if (typeof delta !== 'number' || !reason) {
    return res.status(400).json({ error: 'delta (number) and reason are required' });
  }
  await query(
    `INSERT INTO score_adjustments (run_id, judge_id, delta, reason) VALUES ($1,$2,$3,$4)`,
    [runId, req.user.id, delta, reason]
  );
  const result = await query(
    `UPDATE contest_runs SET total_score = total_score + $1 WHERE id = $2 RETURNING *`,
    [delta, runId]
  );
  res.json({ run: result.rows[0] });
}

function convertToCsv(data, fields) {
  if (!data || data.length === 0) {
    return fields ? fields.join(',') + '\n' : '';
  }
  const headers = fields || Object.keys(data[0]);
  const csvRows = [];
  csvRows.push(headers.join(','));
  for (const row of data) {
    const values = headers.map((field) => {
      const val = row[field] === null || row[field] === undefined ? '' : String(row[field]);
      const escaped = val.replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  return csvRows.join('\n');
}

// GET /api/admin/contests/:contestId/export/leaderboard.csv
export async function exportLeaderboardCsv(req, res) {
  const contestId = await resolveContestId(req.params.contestId);
  const result = await query(
    `SELECT participant_id, name, total_score, started_at, completed_at, status
     FROM leaderboard WHERE contest_id = $1`,
    [contestId]
  );
  const fields = ['participant_id', 'name', 'total_score', 'started_at', 'completed_at', 'status'];
  const csv = convertToCsv(result.rows, fields);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="leaderboard.csv"');
  res.status(200).send(csv);
}

// GET /api/admin/contests/:contestId/export/logs.csv
export async function exportLogsCsv(req, res) {
  const contestId = await resolveContestId(req.params.contestId);
  const result = await query(
    `SELECT u.participant_id, u.name, p.title AS problem, s.verdict, s.tests_passed, s.tests_total,
            s.points_awarded, s.submitted_at,
            CASE
              WHEN pa.started_at IS NOT NULL THEN ROUND(EXTRACT(EPOCH FROM (s.submitted_at - pa.started_at)))
              ELSE NULL
            END AS duration_seconds
     FROM submissions s
     JOIN users u ON u.id = s.user_id
     JOIN problems p ON p.id = s.problem_id
     LEFT JOIN problem_attempts pa ON pa.id = s.attempt_id
     WHERE p.contest_id = $1 ORDER BY s.submitted_at`,
    [contestId]
  );
  const formattedRows = result.rows.map((row) => {
    let completion_time = '-';
    if (row.duration_seconds !== null && row.duration_seconds !== undefined) {
      const sec = Number(row.duration_seconds);
      const mins = Math.floor(sec / 60);
      const secs = Math.floor(sec % 60);
      completion_time = `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
    }
    return {
      ...row,
      completion_time,
    };
  });
  const fields = ['participant_id', 'name', 'problem', 'verdict', 'tests_passed', 'tests_total', 'points_awarded', 'completion_time', 'submitted_at'];
  const csv = convertToCsv(formattedRows, fields);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="submission-logs.csv"');
  res.status(200).send(csv);
}
