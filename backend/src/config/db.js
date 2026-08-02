import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

dotenv.config();

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/hdl_contest',
  max: 20,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('[pg pool error]', err.message);
});

let isInMemory = false;

// Seeded state for in-memory mode
const memoryDb = {
  users: [],
  contests: [],
  problems: [],
  contest_runs: [],
  problem_attempts: [],
  submissions: [],
  score_adjustments: [],
  plagiarism_flags: [],
  audit_log: [],
};

function initInMemoryData() {
  const now = new Date().toISOString();
  
  // Users
  const adminPass = bcrypt.hashSync('admin123', 10);
  const adminPass1 = bcrypt.hashSync('admin_pass1', 10);
  const adminPass2 = bcrypt.hashSync('admin_pass2', 10);
  const adminPass3 = bcrypt.hashSync('admin_pass3', 10);
  const adminPass4 = bcrypt.hashSync('admin_pass4', 10);
  const judgePass = bcrypt.hashSync('judge123', 10);
  
  memoryDb.users = [
    { id: '10000000-0000-0000-0000-000000000001', participant_id: 'admin', name: 'Contest Admin', email: 'admin@hdl.org', password_hash: adminPass, role: 'admin', locale: 'en', created_at: now, is_active: true },
    { id: '10000000-0000-0000-0000-000000000011', participant_id: 'admin1', name: 'Main Admin (Coordinator)', email: 'admin1@ritchennai.edu.in', password_hash: adminPass1, role: 'admin', locale: 'en', created_at: now, is_active: true },
    { id: '10000000-0000-0000-0000-000000000012', participant_id: 'admin2', name: 'Admin 2 (RIT Faculty)', email: 'admin2@ritchennai.edu.in', password_hash: adminPass2, role: 'admin', locale: 'en', created_at: now, is_active: true },
    { id: '10000000-0000-0000-0000-000000000013', participant_id: 'admin3', name: 'Admin 3 (IEI Representative)', email: 'admin3@ieiindia.org', password_hash: adminPass3, role: 'admin', locale: 'en', created_at: now, is_active: true },
    { id: '10000000-0000-0000-0000-000000000014', participant_id: 'admin4', name: 'Admin 4 (Technical Lead)', email: 'admin4@ritchennai.edu.in', password_hash: adminPass4, role: 'admin', locale: 'en', created_at: now, is_active: true },
    { id: '10000000-0000-0000-0000-000000000002', participant_id: 'judge', name: 'Contest Judge', email: 'judge@hdl.org', password_hash: judgePass, role: 'judge', locale: 'en', created_at: now, is_active: true },
  ];

  // Seed participants iei_2600 to iei_2620
  const names = [
    'Aravind S', 'Bala Murugan', 'Deepak Raj', 'Dharshini M', 'Gokulnath K',
    'Hari Prasad', 'Indhuja R', 'Janani V', 'Karthik N', 'Kavya P',
    'Lokesh Kumar', 'Manojkumar T', 'Naveen Raj', 'Pavithra S', 'Rahul Dravid',
    'Sanjay K', 'Shalini M', 'Sri Ram', 'Surya Prakash', 'Swetha R', 'Yogeshwaran'
  ];

  for (let i = 2600; i <= 2620; i++) {
    const idx = i - 2600;
    const participantId = `iei_${i}`;
    const plainPass = `pass_${i}`;
    const studentName = `${names[idx % names.length]} (${participantId})`;
    memoryDb.users.push({
      id: `10000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
      participant_id: participantId,
      name: studentName,
      email: `${participantId}@ritchennai.edu.in`,
      password_hash: bcrypt.hashSync(plainPass, 10),
      role: 'participant',
      locale: 'en',
      created_at: now,
      is_active: true,
    });
  }

  // Contest
  const contestId = '00000000-0000-0000-0000-000000000001';
  memoryDb.contests = [
    {
      id: contestId,
      title: 'HDL Sprint #1',
      description: '5 Verilog problems: 3 Easy + 2 Medium. Good luck!',
      status: 'running',
      starts_at: now,
      ends_at: null,
      created_by: '10000000-0000-0000-0000-000000000001',
      created_at: now,
    },
  ];

  // Problems
  memoryDb.problems = [
    {
      id: '20000000-0000-0000-0000-000000000001',
      contest_id: contestId,
      sequence_no: 1,
      title: '2-to-1 Multiplexer',
      statement_md: '### Task\nImplement a 2-to-1 mux `mux2` with inputs `a, b, sel` and output `y`. `y = sel ? b : a`.',
      difficulty: 'easy',
      points: 100,
      starter_code: 'module mux2(input a, input b, input sel, output y);\n  // TODO: implement\nendmodule\n',
      testbench_code: 'module mux2_tb;\n  reg a, b, sel; wire y;\n  mux2 dut(.a(a), .b(b), .sel(sel), .y(y));\nendmodule\n',
      top_module: 'mux2',
      created_at: now,
    },
    {
      id: '20000000-0000-0000-0000-000000000002',
      contest_id: contestId,
      sequence_no: 2,
      title: '4-bit Adder',
      statement_md: '### Task\nImplement `adder4` with `a[3:0]`, `b[3:0]`, `cin`, outputs `sum[3:0]`, `cout`.',
      difficulty: 'easy',
      points: 100,
      starter_code: 'module adder4(input [3:0] a, input [3:0] b, input cin, output [3:0] sum, output cout);\n  // TODO: implement\nendmodule\n',
      testbench_code: 'module adder4_tb;\n  adder4 dut();\nendmodule\n',
      top_module: 'adder4',
      created_at: now,
    },
    {
      id: '20000000-0000-0000-0000-000000000003',
      contest_id: contestId,
      sequence_no: 3,
      title: 'D Flip-Flop (sync reset)',
      statement_md: '### Task\nImplement `dff_sr` with `clk, rst, d`, output `q`. On rising clk: if rst, q<=0, else q<=d.',
      difficulty: 'easy',
      points: 100,
      starter_code: 'module dff_sr(input clk, input rst, input d, output reg q);\n  // TODO: implement\nendmodule\n',
      testbench_code: 'module dff_sr_tb;\n  dff_sr dut();\nendmodule\n',
      top_module: 'dff_sr',
      created_at: now,
    },
    {
      id: '20000000-0000-0000-0000-000000000004',
      contest_id: contestId,
      sequence_no: 4,
      title: '8-bit Up Counter with Enable',
      statement_md: '### Task\nImplement `counter8` with `clk, rst, en`, output `count[7:0]`. Sync reset to 0; counts up on clk when en=1.',
      difficulty: 'medium',
      points: 200,
      starter_code: 'module counter8(input clk, input rst, input en, output reg [7:0] count);\n  // TODO: implement\nendmodule\n',
      testbench_code: 'module counter8_tb;\n  counter8 dut();\nendmodule\n',
      top_module: 'counter8',
      created_at: now,
    },
    {
      id: '20000000-0000-0000-0000-000000000005',
      contest_id: contestId,
      sequence_no: 5,
      title: 'Traffic Light FSM',
      statement_md: '### Task\nImplement `traffic_fsm`: `clk, rst`, output `light[1:0]` (0=RED,1=GREEN,2=YELLOW). Cycles RED->GREEN->YELLOW->RED every clk, sync reset to RED.',
      difficulty: 'medium',
      points: 200,
      starter_code: 'module traffic_fsm(input clk, input rst, output reg [1:0] light);\n  // TODO: implement\nendmodule\n',
      testbench_code: 'module traffic_fsm_tb;\n  traffic_fsm dut();\nendmodule\n',
      top_module: 'traffic_fsm',
      created_at: now,
    },
  ];
}

export async function waitForDb(retries = 2, delayMs = 500) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query('SELECT 1');
      console.log('Database connection established.');
      return;
    } catch (err) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  console.log('[db] PostgreSQL not connected — enabling in-memory store mode');
  isInMemory = true;
  initInMemoryData();
}

export const query = async (text, params = []) => {
  if (!isInMemory) {
    return pool.query(text, params);
  }
  return handleInMemoryQuery(text, params);
};

export const withTransaction = async (fn) => {
  if (!isInMemory) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } else {
    // In-memory mock client
    const mockClient = {
      query: (t, p) => handleInMemoryQuery(t, p),
    };
    return fn(mockClient);
  }
};

function handleInMemoryQuery(text, params = []) {
  const sql = text.replace(/\s+/g, ' ').trim();
  const sqlUpper = sql.toUpperCase();

  if (sqlUpper.startsWith('SELECT 1')) {
    return { rows: [{ '?column?': 1 }], rowCount: 1 };
  }

  // --- USERS ---
  if (sqlUpper.includes('FROM USERS WHERE PARTICIPANT_ID = $1')) {
    const u = memoryDb.users.find((x) => x.participant_id === params[0]);
    return { rows: u ? [u] : [], rowCount: u ? 1 : 0 };
  }
  if (sqlUpper.includes('FROM USERS WHERE ID = $1')) {
    const u = memoryDb.users.find((x) => x.id === params[0]);
    return { rows: u ? [u] : [], rowCount: u ? 1 : 0 };
  }
  if (sqlUpper.includes('INSERT INTO USERS')) {
    const [participantId, name, passwordHash, email] = params;
    const newUser = {
      id: randomUUID(),
      participant_id: participantId,
      name,
      password_hash: passwordHash,
      email: email || null,
      role: 'participant',
      locale: 'en',
      created_at: new Date().toISOString(),
      is_active: true,
    };
    memoryDb.users.push(newUser);
    return { rows: [newUser], rowCount: 1 };
  }

  // --- CONTESTS ---
  if (sqlUpper.includes('UPDATE CONTESTS SET STATUS = $1 WHERE ID = $2')) {
    const c = memoryDb.contests.find((x) => x.id === params[1]);
    if (c) {
      c.status = params[0];
      return { rows: [c], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }
  if (sqlUpper.includes('FROM CONTESTS')) {
    if (sqlUpper.includes('WHERE STATUS = \'RUNNING\'')) {
      const running = memoryDb.contests.filter((x) => x.status === 'running');
      return { rows: running, rowCount: running.length };
    }
    if (sqlUpper.includes('WHERE ID = $1')) {
      const c = memoryDb.contests.find((x) => x.id === params[0]);
      if (sqlUpper.includes('SELECT STATUS')) {
        return { rows: c ? [{ status: c.status }] : [], rowCount: c ? 1 : 0 };
      }
      return { rows: c ? [c] : [], rowCount: c ? 1 : 0 };
    }
    return { rows: [...memoryDb.contests], rowCount: memoryDb.contests.length };
  }

  // --- CONTEST RUNS ---
  if (sqlUpper.includes('FROM CONTEST_RUNS WHERE CONTEST_ID = $1 AND USER_ID = $2')) {
    const run = memoryDb.contest_runs.find((x) => x.contest_id === params[0] && x.user_id === params[1]);
    return { rows: run ? [run] : [], rowCount: run ? 1 : 0 };
  }
  if (sqlUpper.includes('UPDATE CONTEST_RUNS SET STATUS = \'IN_PROGRESS\'') || (sqlUpper.includes('UPDATE CONTEST_RUNS SET STATUS') && sqlUpper.includes('CURRENT_PROBLEM_SEQ = 1'))) {
    const run = memoryDb.contest_runs.find((x) => x.id === params[0]);
    if (run) {
      run.status = 'in_progress';
      run.current_problem_seq = 1;
      run.started_at = new Date().toISOString();
      return { rows: [run], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }
  if (sqlUpper.includes('INSERT INTO CONTEST_RUNS')) {
    const newRun = {
      id: randomUUID(),
      contest_id: params[0],
      user_id: params[1],
      status: 'in_progress',
      current_problem_seq: 1,
      started_at: new Date().toISOString(),
      completed_at: null,
      total_score: 0,
    };
    memoryDb.contest_runs.push(newRun);
    return { rows: [newRun], rowCount: 1 };
  }
  if (sqlUpper.includes('UPDATE CONTEST_RUNS SET TOTAL_SCORE = TOTAL_SCORE +')) {
    if (params.length >= 4) {
      const [points, nextSeq, status, runId] = params;
      const run = memoryDb.contest_runs.find((x) => x.id === runId);
      if (run) {
        run.total_score = (run.total_score || 0) + points;
        if (nextSeq !== undefined && nextSeq !== null) run.current_problem_seq = nextSeq;
        if (status) run.status = status;
        if (status === 'completed') {
          run.completed_at = new Date().toISOString();
        }
        return { rows: [run], rowCount: 1 };
      }
    } else {
      const [delta, runId] = params;
      const run = memoryDb.contest_runs.find((x) => x.id === runId);
      if (run) {
        run.total_score = (run.total_score || 0) + delta;
        return { rows: [run], rowCount: 1 };
      }
    }
    return { rows: [], rowCount: 0 };
  }
  if (sqlUpper.includes('UPDATE CONTEST_RUNS') && sqlUpper.includes('CURRENT_PROBLEM_SEQ')) {
    const [nextSeq, status, runId] = params;
    const run = memoryDb.contest_runs.find((x) => x.id === runId);
    if (run) {
      if (nextSeq !== undefined && nextSeq !== null) run.current_problem_seq = nextSeq;
      if (status) run.status = status;
      if (status === 'completed') {
        run.completed_at = new Date().toISOString();
      }
      return { rows: [run], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // --- PROBLEMS ---
  if (sqlUpper.includes('FROM PROBLEMS WHERE CONTEST_ID = $1 AND SEQUENCE_NO = $2')) {
    const p = memoryDb.problems.find((x) => x.contest_id === params[0] && Number(x.sequence_no) === Number(params[1]));
    return { rows: p ? [p] : [], rowCount: p ? 1 : 0 };
  }
  if (sqlUpper.includes('FROM PROBLEMS WHERE ID = $1')) {
    const p = memoryDb.problems.find((x) => x.id === params[0]);
    return { rows: p ? [p] : [], rowCount: p ? 1 : 0 };
  }
  if (sqlUpper.includes('INSERT INTO PROBLEMS')) {
    const [contestId, sequenceNo, title, statementMd, difficulty, points, starterCode, testbenchCode, topModule] = params;
    const newProb = {
      id: randomUUID(),
      contest_id: contestId,
      sequence_no: sequenceNo,
      title,
      statement_md: statementMd,
      difficulty,
      points,
      starter_code: starterCode || '',
      testbench_code: testbenchCode,
      top_module: topModule,
      created_at: new Date().toISOString(),
    };
    memoryDb.problems.push(newProb);
    return { rows: [newProb], rowCount: 1 };
  }
  if (sqlUpper.includes('UPDATE PROBLEMS SET')) {
    const [title, statementMd, difficulty, points, starterCode, testbenchCode, topModule, id] = params;
    const p = memoryDb.problems.find((x) => x.id === id);
    if (p) {
      if (title) p.title = title;
      if (statementMd) p.statement_md = statementMd;
      if (difficulty) p.difficulty = difficulty;
      if (points !== undefined) p.points = points;
      if (starterCode !== undefined) p.starter_code = starterCode;
      if (testbenchCode !== undefined) p.testbench_code = testbenchCode;
      if (topModule !== undefined) p.top_module = topModule;
      return { rows: [p], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }
  if (sqlUpper.includes('DELETE FROM PROBLEMS WHERE ID = $1')) {
    memoryDb.problems = memoryDb.problems.filter((x) => x.id !== params[0]);
    return { rows: [], rowCount: 1 };
  }

  // --- PROBLEM ATTEMPTS ---
  if (sqlUpper.includes('FROM PROBLEM_ATTEMPTS WHERE RUN_ID = $1 AND PROBLEM_ID = $2')) {
    const att = memoryDb.problem_attempts.find((x) => x.run_id === params[0] && x.problem_id === params[1]);
    return { rows: att ? [att] : [], rowCount: att ? 1 : 0 };
  }
  if (sqlUpper.includes('INSERT INTO PROBLEM_ATTEMPTS')) {
    let runId, problemId, timeMode, limitSec, deadlineAt;
    if (params.length === 4) {
      [runId, problemId, limitSec, deadlineAt] = params;
      timeMode = 'standard';
    } else {
      [runId, problemId, timeMode, limitSec, deadlineAt] = params;
    }
    const dDate = deadlineAt ? new Date(deadlineAt) : new Date(Date.now() + (limitSec || 420) * 1000);
    const validDeadline = isNaN(dDate.getTime()) ? new Date(Date.now() + 420000) : dDate;
    const newAtt = {
      id: randomUUID(),
      run_id: runId,
      problem_id: problemId,
      time_mode: timeMode || 'standard',
      time_limit_sec: limitSec || 420,
      started_at: new Date().toISOString(),
      deadline_at: validDeadline.toISOString(),
      draft_code: null,
      finished_at: null,
    };
    memoryDb.problem_attempts.push(newAtt);
    return { rows: [newAtt], rowCount: 1 };
  }
  if (sqlUpper.includes('UPDATE PROBLEM_ATTEMPTS SET DRAFT_CODE = $1')) {
    const [code, runId, problemId] = params;
    const att = memoryDb.problem_attempts.find((x) => x.run_id === runId && x.problem_id === problemId && !x.finished_at);
    if (att) {
      att.draft_code = code;
      return { rows: [{ id: att.id }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }
  if (sqlUpper.includes('UPDATE PROBLEM_ATTEMPTS SET FINISHED_AT = NOW() WHERE ID = $1')) {
    const att = memoryDb.problem_attempts.find((x) => x.id === params[0]);
    if (att) {
      att.finished_at = new Date().toISOString();
      return { rows: [att], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }
  if (sqlUpper.includes('FROM PROBLEM_ATTEMPTS PA') && sqlUpper.includes('PA.FINISHED_AT IS NULL')) {
    const now = new Date();
    const expired = memoryDb.problem_attempts.filter((pa) => {
      if (pa.finished_at) return false;
      return new Date(pa.deadline_at) < now;
    }).map((pa) => {
      const cr = memoryDb.contest_runs.find((x) => x.id === pa.run_id) || {};
      const p = memoryDb.problems.find((x) => x.id === pa.problem_id) || {};
      const u = memoryDb.users.find((x) => x.id === cr.user_id) || {};
      return {
        ...pa,
        contest_id: cr.contest_id,
        run_id: cr.id,
        sequence_no: p.sequence_no,
        difficulty: p.difficulty,
        testbench_code: p.testbench_code,
        top_module: p.top_module,
        user_id: cr.user_id,
        participant_id: u.participant_id,
        name: u.name,
      };
    });
    return { rows: expired, rowCount: expired.length };
  }

  // --- SUBMISSIONS ---
  if (sqlUpper.includes('INSERT INTO SUBMISSIONS') && params.length === 5) {
    const [attemptId, userId, problemId, code, codeHash] = params;
    const sub = {
      id: randomUUID(),
      attempt_id: attemptId,
      user_id: userId,
      problem_id: problemId,
      code,
      code_hash: codeHash,
      verdict: 'compiling',
      tests_passed: 0,
      tests_total: 0,
      compiler_log: null,
      points_awarded: 0,
      submitted_at: new Date().toISOString(),
      graded_at: null,
    };
    memoryDb.submissions.push(sub);
    return { rows: [{ id: sub.id }], rowCount: 1 };
  }
  if (sqlUpper.includes('INSERT INTO SUBMISSIONS') && params.length >= 10) {
    const [attemptId, userId, problemId, code, codeHash, verdict, testsPassed, testsTotal, compilerLog, pointsAwarded] = params;
    const sub = {
      id: randomUUID(),
      attempt_id: attemptId,
      user_id: userId,
      problem_id: problemId,
      code,
      code_hash: codeHash,
      verdict,
      tests_passed: testsPassed,
      tests_total: testsTotal,
      compiler_log: compilerLog,
      points_awarded: pointsAwarded,
      submitted_at: new Date().toISOString(),
      graded_at: new Date().toISOString(),
    };
    memoryDb.submissions.push(sub);
    return { rows: [{ id: sub.id }], rowCount: 1 };
  }
  if (sqlUpper.includes('UPDATE SUBMISSIONS SET VERDICT = $1')) {
    const [verdict, testsPassed, testsTotal, compilerLog, pointsAwarded, submissionId] = params;
    const sub = memoryDb.submissions.find((x) => x.id === submissionId);
    if (sub) {
      sub.verdict = verdict;
      sub.tests_passed = testsPassed;
      sub.tests_total = testsTotal;
      sub.compiler_log = compilerLog;
      sub.points_awarded = pointsAwarded;
      sub.graded_at = new Date().toISOString();
      return { rows: [sub], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }
  if (sqlUpper.includes('FROM SUBMISSIONS WHERE PROBLEM_ID = $1 AND USER_ID != $2 AND VERDICT = \'PASSED\'')) {
    const subs = memoryDb.submissions.filter((x) => x.problem_id === params[0] && x.user_id !== params[1] && x.verdict === 'passed');
    return { rows: subs, rowCount: subs.length };
  }
  if (sqlUpper.includes('FROM SUBMISSIONS S') && sqlUpper.includes('WHERE P.CONTEST_ID = $1')) {
    const subs = memoryDb.submissions.filter((s) => {
      const p = memoryDb.problems.find((x) => x.id === s.problem_id);
      return p && p.contest_id === params[0];
    }).map((s) => {
      const u = memoryDb.users.find((x) => x.id === s.user_id) || {};
      const p = memoryDb.problems.find((x) => x.id === s.problem_id) || {};
      return {
        id: s.id,
        participant_id: u.participant_id,
        name: u.name,
        problem_title: p.title,
        verdict: s.verdict,
        tests_passed: s.tests_passed,
        tests_total: s.tests_total,
        points_awarded: s.points_awarded,
        submitted_at: s.submitted_at,
      };
    });
    subs.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
    return { rows: subs, rowCount: subs.length };
  }
  if (sqlUpper.includes('FROM SUBMISSIONS WHERE ID = $1')) {
    const sub = memoryDb.submissions.find((x) => x.id === params[0]);
    return { rows: sub ? [sub] : [], rowCount: sub ? 1 : 0 };
  }

  // --- LEADERBOARD ---
  if (sqlUpper.includes('FROM LEADERBOARD WHERE CONTEST_ID = $1') || (sqlUpper.includes('FROM CONTEST_RUNS') && sqlUpper.includes('LEADERBOARD'))) {
    const runs = memoryDb.contest_runs.filter((r) => r.contest_id === params[0]);
    const rows = runs.map((cr) => {
      const u = memoryDb.users.find((x) => x.id === cr.user_id) || {};
      let duration_seconds = null;
      if (cr.completed_at && cr.started_at) {
        duration_seconds = (new Date(cr.completed_at).getTime() - new Date(cr.started_at).getTime()) / 1000;
      }
      return {
        participant_id: u.participant_id,
        name: u.name,
        contest_id: cr.contest_id,
        total_score: cr.total_score,
        started_at: cr.started_at,
        completed_at: cr.completed_at,
        duration_seconds,
        status: cr.status,
      };
    });
    rows.sort((a, b) => {
      if (b.total_score !== a.total_score) return b.total_score - a.total_score;
      const da = a.duration_seconds ?? Infinity;
      const db = b.duration_seconds ?? Infinity;
      return da - db;
    });
    return { rows, rowCount: rows.length };
  }

  // --- ANALYTICS ---
  if (sqlUpper.includes('FROM CONTEST_RUNS WHERE CONTEST_ID = $1') && sqlUpper.includes('COUNT(*)')) {
    const runs = memoryDb.contest_runs.filter((x) => x.contest_id === params[0]);
    const completedRuns = runs.filter((x) => x.status === 'completed');
    const totalScore = completedRuns.reduce((acc, r) => acc + (r.total_score || 0), 0);
    const avgScore = completedRuns.length > 0 ? totalScore / completedRuns.length : 0;
    return {
      rows: [
        {
          total: runs.length,
          completed: completedRuns.length,
          in_progress: runs.filter((x) => x.status === 'in_progress').length,
          avg_score: avgScore,
        },
      ],
      rowCount: 1,
    };
  }
  if (sqlUpper.includes('FROM PROBLEMS P') && sqlUpper.includes('LEFT JOIN SUBMISSIONS S')) {
    const contestProblems = memoryDb.problems.filter((x) => x.contest_id === params[0]);
    contestProblems.sort((a, b) => a.sequence_no - b.sequence_no);
    const rows = contestProblems.map((p) => {
      const pSubs = memoryDb.submissions.filter((s) => s.problem_id === p.id);
      const passedSubs = pSubs.filter((s) => s.verdict === 'passed');
      return {
        sequence_no: p.sequence_no,
        title: p.title,
        difficulty: p.difficulty,
        passed: passedSubs.length,
        attempts: pSubs.length,
      };
    });
    return { rows, rowCount: rows.length };
  }

  // Fallback default
  return { rows: [], rowCount: 0 };
}
