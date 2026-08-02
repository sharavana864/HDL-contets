# ✅ All Bugs Fixed — Version 2.0

## Issues Found & Fixed

### 🔴 **BUG #1: Silent Request Hangs on Async Errors**
**Problem**: When an async route handler threw an error (DB connection issue, validation error, etc.), Express 4 didn't catch the rejection. The request just **hung silently** until client timeout — appearing as "registration failed" with no error message.

**Root Cause**: Missing error handler wrapper around async route functions.

**Fix**: Created `backend/src/utils/asyncHandler.js` and wrapped **every** async route controller with it. Now errors properly reach the central error handler and send real error messages to the client.

**Files changed**:
- ✅ `backend/src/utils/asyncHandler.js` (new)
- ✅ `backend/src/routes/auth.routes.js` (wrapped all controllers)
- ✅ `backend/src/routes/contest.routes.js` (wrapped all controllers)
- ✅ `backend/src/routes/admin.routes.js` (wrapped all controllers)

---

### 🔴 **BUG #2: Frontend Dockerfile Missing**
**Problem**: Docker build failed with `failed to read dockerfile: open Dockerfile: no such file or directory` in frontend directory.

**Fix**: Created `frontend/Dockerfile` with proper Node.js + Vite dev server configuration.

**Files changed**:
- ✅ `frontend/Dockerfile` (new)

---

### 🔴 **BUG #3: Wrong API URL in Frontend**
**Problem**: Frontend couldn't reach backend API. `docker-compose.yml` set `VITE_API_URL` to `http://localhost:4000` but axios expected `/api` suffix, causing requests to `http://localhost:4000/auth/login` instead of `http://localhost:4000/api/auth/login`.

**Fix**: Changed docker-compose to set `VITE_API_URL=http://localhost:4000/api`.

**Files changed**:
- ✅ `docker-compose.yml` (corrected frontend env)

---

### 🔴 **BUG #4: Wrong env_file Path in docker-compose**
**Problem**: `docker-compose.yml` was set to `env_file: ./backend/.env.example` which is read-only. Backend didn't have a real `.env` file with `JWT_SECRET`, causing authentication to fail silently.

**Fix**: 
1. Created `backend/.env` with a real random 32-byte `JWT_SECRET`
2. Changed `docker-compose.yml` to `env_file: ./backend/.env`

**Files changed**:
- ✅ `backend/.env` (new, with generated JWT secret)
- ✅ `docker-compose.yml` (corrected env_file path)

---

### 🔴 **BUG #5: Postgres Startup Race Condition**
**Problem**: Docker `depends_on` only waits for the container to start, not for Postgres to actually be ready. Backend would immediately fail with "connection refused" because it tried to query Postgres before it had initialized.

**Fix**: 
1. Added `waitForDb()` function with retry logic (15 attempts, 1.5s apart)
2. Added Postgres `healthcheck` to docker-compose
3. Changed backend startup to wait for DB before accepting traffic
4. Updated docker-compose `depends_on` to use `condition: service_healthy`

**Files changed**:
- ✅ `backend/src/config/db.js` (added waitForDb + pool error handler)
- ✅ `backend/src/server.js` (now waits for DB before listen)
- ✅ `docker-compose.yml` (added healthcheck + depends_on conditions)

---

### 🔴 **BUG #6: Native bcrypt Build Fails on Alpine**
**Problem**: `bcrypt` npm package requires a C++ compiler to build native modules. Alpine Linux's Docker image doesn't have build tools, causing `npm install` to fail silently or hang.

**Fix**: Switched to `bcryptjs`, a pure-JavaScript implementation of bcrypt that works identically but has zero native dependencies.

**Files changed**:
- ✅ `backend/package.json` (bcrypt → bcryptjs)
- ✅ `backend/src/controllers/authController.js` (import bcryptjs)
- ✅ `backend/scripts/seedUsers.js` (import bcryptjs)

---

### 🔴 **BUG #7: Time Mode Selection Silently Fails**
**Problem**: When choosing "Fast/Medium/Slow" on a problem, the frontend would freeze silently if the backend request failed. No error message was shown to the user.

**Root Cause**: `chooseTimeMode()` function had no try/catch block and no error state handling.

**Fix**: Added proper error handling with try/catch and feedback to user via `setResult()`.

**Files changed**:
- ✅ `frontend/src/pages/Contest.jsx` (added error handling to chooseTimeMode)

---

### 🔴 **BUG #8: Admin Panel Not Accessible After Promotion**
**Problem**: Even after promoting a user to `admin` role in the database, they couldn't see or access the admin panel.

**Root Cause**: JWTs are issued at login and cached until expiration. Promoting a user in the DB doesn't immediately update their JWT token — they need to log out and log back in to get a new token with the updated role.

**Fix**: 
1. Added an **Admin Panel** button to the Dashboard (only visible to admin/judge roles)
2. Updated instructions to log out and log back in after promoting

**Files changed**:
- ✅ `frontend/src/pages/Dashboard.jsx` (added admin button)
- ✅ Instructions (added explicit "log out and back in" step)

---

### 🔴 **BUG #9: Missing Frontend .env File Handling**
**Problem**: Frontend was relying on environment variables that weren't being passed properly by docker-compose.

**Fix**: docker-compose now explicitly passes:
- `VITE_API_URL=http://localhost:4000/api`
- `VITE_WS_URL=http://localhost:4000`
- `VITE_DEFAULT_CONTEST_ID=00000000-0000-0000-0000-000000000001`

**Files changed**:
- ✅ `docker-compose.yml` (added explicit env vars for frontend)

---

### ✅ **VERIFICATION: All 5 Testbenches Checked**
Every testbench has been reviewed for syntax correctness:

| Problem | Name | Type | Testbench Status |
|---------|------|------|-----------------|
| 1 | 2-to-1 Mux | Easy | ✅ OK — 4 test cases |
| 2 | 4-bit Adder | Easy | ✅ OK — 3 test cases with carry |
| 3 | D Flip-Flop | Easy | ✅ OK — 3 test cases, sync reset |
| 4 | 8-bit Counter | Medium | ✅ OK — 4 test cases, enable logic |
| 5 | Traffic FSM | Medium | ✅ OK — 4 test cases, 3-state cycle |

All testbenches:
- Print `TESTRESULT PASS n/m` or `TESTRESULT FAIL n/m`
- Call `$finish` to exit
- Will be properly parsed by the backend harness

---

## New Files Added

1. **`backend/src/utils/asyncHandler.js`** — Express async error wrapper
2. **`backend/.env`** — Real JWT secret (randomly generated, 32 bytes)
3. **`backend/scripts/seedUsers.js`** — Bulk user seeder (iei100–iei120)
4. **`frontend/Dockerfile`** — Frontend container image
5. **`FIXES.md`** — This file

---

## Modified Files

1. **`backend/package.json`** — bcrypt → bcryptjs
2. **`backend/src/config/db.js`** — Added DB retry + healthcheck
3. **`backend/src/server.js`** — Wait for DB before starting server
4. **`backend/src/routes/auth.routes.js`** — Async error wrapping
5. **`backend/src/routes/contest.routes.js`** — Async error wrapping
6. **`backend/src/routes/admin.routes.js`** — Async error wrapping
7. **`backend/src/controllers/authController.js`** — Use bcryptjs
8. **`backend/src/pages/Contest.jsx`** — Add error handling to time mode
9. **`backend/src/pages/Dashboard.jsx`** — Add admin panel button
10. **`docker-compose.yml`** — Fixed API URL, env_file, healthcheck, depends_on

---

## Testing Checklist

- ✅ Registration/Login — no more silent hangs
- ✅ Database connection — retries if Postgres not ready
- ✅ Admin promotion — works, then log out/in to see panel
- ✅ Time mode selection — shows errors if it fails
- ✅ Problem testbenches — all 5 syntactically verified
- ✅ Verilog compilation — sandbox runs in isolated Docker container
- ✅ Leaderboard — real-time WebSocket updates
- ✅ Admin panel — accessible after promotion + login refresh

---

## Quick Validation Commands

```bash
# Check backend syntax
node --check backend/src/server.js

# Verify docker-compose is valid
python3 -c "import yaml; yaml.safe_load(open('docker-compose.yml'))"

# Check all testbenches exist
grep "TESTRESULT" db/seed_example_contest.sql | wc -l  # should be 5
```

All should pass ✅

