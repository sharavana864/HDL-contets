-- =====================================================================
-- HDL Contest Platform — PostgreSQL Schema
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- USERS & ROLES
-- ---------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('participant', 'judge', 'admin');

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant_id  VARCHAR(50) UNIQUE NOT NULL,   -- human-facing contest ID
    name            VARCHAR(150) NOT NULL,
    email           VARCHAR(255) UNIQUE,
    password_hash   TEXT NOT NULL,                 -- bcrypt
    role            user_role NOT NULL DEFAULT 'participant',
    locale          VARCHAR(10) NOT NULL DEFAULT 'en',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active       BOOLEAN NOT NULL DEFAULT true
);

-- ---------------------------------------------------------------------
-- CONTESTS (supports running more than one contest/event over time)
-- ---------------------------------------------------------------------
CREATE TYPE contest_status AS ENUM ('draft', 'scheduled', 'running', 'paused', 'ended');

CREATE TABLE contests (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    status          contest_status NOT NULL DEFAULT 'draft',
    starts_at       TIMESTAMPTZ,
    ends_at         TIMESTAMPTZ,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- PROBLEMS
-- ---------------------------------------------------------------------
CREATE TYPE problem_difficulty AS ENUM ('easy', 'medium');

CREATE TABLE problems (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contest_id      UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    sequence_no     SMALLINT NOT NULL,             -- 1..5, fixed ordering
    title           VARCHAR(255) NOT NULL,
    statement_md    TEXT NOT NULL,                 -- problem statement (markdown)
    difficulty      problem_difficulty NOT NULL,
    points          INTEGER NOT NULL,              -- 100 (easy) / 200 (medium)
    starter_code    TEXT NOT NULL DEFAULT '',       -- Verilog module skeleton
    testbench_code  TEXT NOT NULL,                 -- hidden testbench (never sent to client)
    top_module      VARCHAR(100) NOT NULL,          -- module name to bind for compilation
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (contest_id, sequence_no)
);

-- ---------------------------------------------------------------------
-- CONTEST RUN — one row per participant per contest (tracks progress)
-- ---------------------------------------------------------------------
CREATE TYPE run_status AS ENUM ('not_started', 'in_progress', 'completed');

CREATE TABLE contest_runs (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contest_id          UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status              run_status NOT NULL DEFAULT 'not_started',
    current_problem_seq SMALLINT NOT NULL DEFAULT 0,   -- 0 = not yet started
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    total_score         INTEGER NOT NULL DEFAULT 0,
    UNIQUE (contest_id, user_id)
);

-- ---------------------------------------------------------------------
-- PROBLEM ATTEMPTS — per-problem timer/time-mode bookkeeping
-- ---------------------------------------------------------------------
CREATE TYPE time_mode AS ENUM ('fast', 'medium', 'slow');   -- 1 / 3 / 5 minutes

CREATE TABLE problem_attempts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id          UUID NOT NULL REFERENCES contest_runs(id) ON DELETE CASCADE,
    problem_id      UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    time_mode       time_mode NOT NULL,
    time_limit_sec  INTEGER NOT NULL,               -- 60 / 180 / 300
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deadline_at     TIMESTAMPTZ NOT NULL,            -- started_at + time_limit_sec
    draft_code      TEXT,                            -- auto-saved every N seconds
    finished_at     TIMESTAMPTZ,
    UNIQUE (run_id, problem_id)
);

-- ---------------------------------------------------------------------
-- SUBMISSIONS — every compile/test attempt (multiple allowed pre-deadline
-- unless contest rules say "first submit only"; final one used for scoring)
-- ---------------------------------------------------------------------
CREATE TYPE submission_verdict AS ENUM ('pending', 'compiling', 'passed', 'failed', 'compile_error', 'timeout');

CREATE TABLE submissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id      UUID NOT NULL REFERENCES problem_attempts(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    problem_id      UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    code            TEXT NOT NULL,
    code_hash       VARCHAR(64) NOT NULL,            -- sha256, used by plagiarism check
    verdict         submission_verdict NOT NULL DEFAULT 'pending',
    tests_passed    INTEGER NOT NULL DEFAULT 0,
    tests_total     INTEGER NOT NULL DEFAULT 0,
    compiler_log    TEXT,
    points_awarded  INTEGER NOT NULL DEFAULT 0,
    submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    graded_at       TIMESTAMPTZ
);
CREATE INDEX idx_submissions_code_hash ON submissions(code_hash);
CREATE INDEX idx_submissions_problem ON submissions(problem_id);

-- ---------------------------------------------------------------------
-- JUDGE ADJUSTMENTS — manual bonus/penalty, fully audited
-- ---------------------------------------------------------------------
CREATE TABLE score_adjustments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id          UUID NOT NULL REFERENCES contest_runs(id) ON DELETE CASCADE,
    judge_id        UUID NOT NULL REFERENCES users(id),
    delta           INTEGER NOT NULL,               -- +bonus / -penalty
    reason          TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- PLAGIARISM FLAGS
-- ---------------------------------------------------------------------
CREATE TABLE plagiarism_flags (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_a    UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    submission_b    UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    similarity      NUMERIC(5,2) NOT NULL,           -- 0.00 - 100.00
    method          VARCHAR(50) NOT NULL,            -- e.g. 'token-jaccard', 'ast-diff'
    reviewed        BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- AUDIT LOG — admin/judge actions, contest start/stop, problem edits
-- ---------------------------------------------------------------------
CREATE TABLE audit_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id        UUID REFERENCES users(id),
    action          VARCHAR(100) NOT NULL,
    details         JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- LEADERBOARD VIEW — sorted by score desc, then fastest completion
-- ---------------------------------------------------------------------
CREATE VIEW leaderboard AS
SELECT
    u.participant_id,
    u.name,
    cr.contest_id,
    cr.total_score,
    cr.started_at,
    cr.completed_at,
    CASE WHEN cr.completed_at IS NOT NULL
         THEN EXTRACT(EPOCH FROM (cr.completed_at - cr.started_at))
         ELSE NULL END AS duration_seconds,
    cr.status
FROM contest_runs cr
JOIN users u ON u.id = cr.user_id
ORDER BY cr.total_score DESC, duration_seconds ASC NULLS LAST;

-- Helpful indexes
CREATE INDEX idx_contest_runs_score ON contest_runs (contest_id, total_score DESC);
CREATE INDEX idx_problem_attempts_deadline ON problem_attempts (deadline_at);
