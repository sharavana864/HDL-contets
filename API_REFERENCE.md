# API Reference

Base URL: `/api`. All routes except `/auth/register` and `/auth/login` require
`Authorization: Bearer <jwt>`.

## Auth
| Method | Path | Role | Description |
|---|---|---|---|
| POST | /auth/register | public | `{ participantId, name, password, email? }` → `{ token, user }` |
| POST | /auth/login | public | `{ participantId, password }` → `{ token, user }` |
| GET | /auth/me | any | current user profile |

## Contest / Participant flow
| Method | Path | Role | Description |
|---|---|---|---|
| GET | /contests/:contestId | any | contest rules + this user's run/progress |
| POST | /contests/:contestId/start | participant | "Start Challenge" — creates/resumes the run |
| GET | /contests/:contestId/current-problem | participant | serves the run's current problem (no testbench leaked) |
| POST | /contests/:contestId/problems/:problemId/time-mode | participant | `{ timeMode: fast|medium|slow }` — starts the per-problem deadline |
| PUT | /contests/:contestId/problems/:problemId/draft | participant | `{ code }` — auto-save (called every few seconds by the editor) |
| POST | /contests/:contestId/problems/:problemId/submit | participant | `{ code }` — compiles, runs hidden testbench, grades, advances run |
| GET | /contests/:contestId/leaderboard | any | current standings |
| POST | /contests/:contestId/control | admin | `{ action: start|pause|end }` |

## Admin / Judge
| Method | Path | Role | Description |
|---|---|---|---|
| GET | /admin/contests/:contestId/analytics | admin | participant counts, avg score, per-problem pass rates |
| GET | /admin/contests/:contestId/submissions | admin, judge | live submission feed (compilation status/logs) |
| GET | /admin/submissions/:submissionId/log | admin, judge | full compiler log + code for one submission |
| POST | /admin/problems | admin | create a problem |
| PUT | /admin/problems/:id | admin | edit a problem |
| DELETE | /admin/problems/:id | admin | remove a problem |
| POST | /admin/runs/:runId/adjust | admin, judge | `{ delta, reason }` — manual bonus/penalty, fully audited |
| GET | /admin/contests/:contestId/export/leaderboard.csv | admin, judge | CSV download |
| GET | /admin/contests/:contestId/export/logs.csv | admin, judge | CSV download |

## WebSocket events (Socket.io, auth via `{ auth: { token } }` on connect)
- `leaderboard:subscribe` (emit, client→server) — join a contest's leaderboard room
- `leaderboard:update` (server→client) — `{ participantId, name, totalScore, status }`
- `contest:state` (server→client) — `{ contestId, status }` on start/pause/end
- `admin:subscribe` (emit, admin/judge only) — join the live-monitoring room
- `admin:submission` (server→client) — `{ submissionId, userId, problemId, status, points }`
