# HDL Contest Platform — System Architecture

A full-stack platform for running timed Verilog/HDL coding contests with automatic
compilation, testbench grading, real-time leaderboards, and an admin/judge panel.

## 1. Architecture Overview

```
                         ┌─────────────────────┐
                         │   React Frontend     │
                         │  (Vite + Socket.io   │
                         │   client + Monaco)   │
                         └──────────┬───────────┘
                                    │ HTTPS (REST) + WSS
                                    ▼
                         ┌─────────────────────┐
                         │  Node.js / Express   │
                         │  API + WebSocket Hub │
                         │  (JWT auth, RBAC)    │
                         └──────────┬───────────┘
                     ┌──────────────┼───────────────────┐
                     ▼              ▼                    ▼
           ┌─────────────┐  ┌──────────────┐   ┌────────────────────┐
           │ PostgreSQL   │  │ Redis        │   │ Compiler Worker(s) │
           │ (users,      │  │ (job queue,  │   │ Dockerized         │
           │  problems,   │  │  pub/sub for │   │ Icarus Verilog /   │
           │  submissions,│  │  WS scaling, │   │ Verilator, one     │
           │  scores)     │  │  rate-limits)│   │ ephemeral          │
           └─────────────┘  └──────────────┘   │ container/run      │
                                                 └────────────────────┘
```

- **Frontend (React)**: login/register, dashboard, contest flow, Monaco-based Verilog
  editor, live timer, leaderboard, admin/judge panels. Talks to backend via REST for
  CRUD and via a WebSocket for live leaderboard/submission-status pushes.
- **Backend (Node/Express)**: stateless REST API + a Socket.io hub. Issues JWTs,
  enforces RBAC (`admin`, `judge`, `participant`), owns scoring rules, enqueues
  compile jobs, and broadcasts leaderboard deltas.
- **Compiler Service**: submissions are never run in the API process. Each submission
  is written to a temp workspace, mounted into a locked-down, resource-limited,
  network-disabled Docker container (`iverilog`/`vvp` or `verilator`), run against the
  problem's hidden testbench, and the pass/fail + logs are returned. This isolates
  arbitrary user Verilog from the host.
- **PostgreSQL**: source of truth for users, problems, submissions, scores, contest
  state, plagiarism flags, audit log.
- **Redis** (recommended for >1 backend instance): Socket.io adapter for horizontal
  scaling, BullMQ queue for compile jobs so many concurrent submissions don't starve
  the event loop, and auto-save draft cache.

## 2. Contest Flow (state machine)

```
registered → (admin opens contest) → dashboard(ready) → "Start Challenge"
  → problem 1/5 (choose time mode → editor → submit → compile+test → score)
  → problem 2/5 ... → problem 5/5 → contest complete → results
```

Once "Start Challenge" is pressed, the backend stamps `contest_start_at` on the
participant's `contest_run` row server-side (never trust client time) and the 5
problems are served **sequentially** — the API only returns problem *N+1* once
problem *N* has a terminal submission (pass, fail, or timed out). Each problem's
per-problem timer (1/3/5 min, chosen by the participant before that problem starts)
is also tracked server-side; when it expires the backend force-submits whatever code
is in the draft (or empty) and grades it.

## 3. Deliverables in this repo

- `db/schema.sql` — full PostgreSQL schema.
- `backend/` — Express API, JWT auth, RBAC middleware, scoring, compiler service,
  WebSocket hub, plagiarism check, CSV export.
- `backend/compiler-docker/` — Dockerfile for a locked-down Icarus Verilog runner
  image + the harness script executed inside it.
- `frontend/` — React app: auth pages, dashboard, contest runner, Monaco code editor,
  leaderboard, admin panel, i18n scaffold.
- `docker-compose.yml` — Postgres + Redis + backend + compiler image, one command to
  bring up a full dev stack.

See inline comments in each file — this is a working reference implementation sized
for a real contest (dozens–low hundreds of concurrent participants); swap in BullMQ
workers and a container pool for larger scale.
