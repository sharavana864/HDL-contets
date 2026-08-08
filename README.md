# ⚡ C³ — Code • Compile • Conquer
### *Production-Grade Hardware Description Language (Verilog) Contest & Judging Platform*

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg?style=flat-square)](https://github.com)
[![Node.js Version](https://img.shields.io/badge/node.js-v20%2B-blue.svg?style=flat-square)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-v18.3.1-61dafb.svg?style=flat-square)](https://react.dev/)
[![HDL Engine](https://img.shields.io/badge/HDL-Icarus%20Verilog%20%2F%20VVP-orange.svg?style=flat-square)](http://iverilog.icarus.com/)
[![Database](https://img.shields.io/badge/database-PostgreSQL-336791.svg?style=flat-square)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](LICENSE)

---

## 📌 Executive Summary

**C³ (Code • Compile • Conquer)** is an advanced, full-stack online judging and competitive programming platform specifically engineered for **Hardware Description Languages (Verilog / Digital System Design)**. Designed for academic institutions, hackathons, and high-concurrency coding contests, C³ enables automated compilation, strict testbench execution, real-time leaderboard streaming, automated server-side timer enforcement, anti-cheat code similarity detection, and full admin contest administration.

Author & Lead Architect: **Sharavanakumar R**

---

## 🚀 Key Features

### 🖥️ 1. Professional Web IDE & Contest Interface
* **Monaco Verilog Editor**: In-browser VS Code-powered editor featuring custom Verilog syntax highlighting, code auto-completion, line numbers, error linting, and bracket matching.
* **Auto-Save Draft Engine**: Client-side auto-save with server-backed persistence to ensure zero data loss during network interruptions or page reloads.
* **Real-time Live Logs**: Interactive terminal output displaying Icarus Verilog (`iverilog`) compilation logs, detailed signal mismatches, and waveform pass/fail test vectors.
* **Multi-Language Support (i18n)**: Seamless language localization powered by `i18next`.

### ⏱️ 2. Server-Side Synchronized Contest Engine
* **Tamper-Proof Timers**: Per-problem timers (1, 3, or 5 minutes) and total contest timers are stamped and verified exclusively on the backend (`contest_run`).
* **Automated Force-Submit**: Background timer sweeper task automatically collects active user code drafts and submits them for evaluation immediately upon time expiration.
* **Sequential Problem Gating**: Participants navigate through structured problem sets sequentially, preventing premature problem disclosures.

### 🧪 3. Robust Verilog Compilation & Simulation Pipeline
* **Dual Execution Sandbox**:
  1. **Dockerized Icarus Verilog (`iverilog` / `vvp`)**: Containerized, network-disabled, CPU/memory-capped execution environment for running arbitrary HDL submissions against hidden verification testbenches safely.
  2. **Deterministic Fallback AST Engine**: High-performance internal Verilog logic evaluation engine for instant local execution and testbench validation.
* **Comprehensive Circuit Verification**: Pre-configured testbenches and evaluations supporting both **Combinational** and **Sequential** digital circuits:
  * 3-to-8 Decoders & Priority Encoders
  * 8-to-1 Multiplexers (MUX) & Demultiplexers
  * Ripple Carry Adders (RCA) & Full Adders
  * 4-bit Ring Counters & Johnson Counters
  * Clock Frequency Dividers
  * Bidirectional Shift Registers
  * Finite State Machines (FSM - Mealy & Moore)

### 📊 4. Real-Time Leaderboard & Live Analytics
* **Socket.io Streaming**: Instant WebSocket broadcast of live score updates, ranking shifts, and submission verdicts across all active user sessions.
* **AC / Penalty Scoring**: ACM-ICPC style scoring mechanism considering submission speed, test vector coverage, and penalty points for incorrect submissions.

### 🛡️ 5. Security & Anti-Cheat System
* **Plagiarism & Code Similarity Detector**: Automated token-based AST parser comparing submissions across participants to detect copy-paste attempts and structural similarities.
* **Role-Based Access Control (RBAC)**: Fine-grained user permission tiers (`participant`, `judge`, `admin`).
* **Enterprise Security Protocols**: Enforced JWT authentication, password hashing via `bcryptjs`, HTTP security headers via `helmet`, CORS protection, and rate limiting via `express-rate-limit`.

### 🛠️ 6. Admin & Judge Control Panel
* **Live Monitoring**: Real-time contestant progress tracking, total submission volume analysis, and system health status.
* **Problem Bank Management**: Full CRUD interface for creating Verilog challenges, custom testbenches, constraints, and reference solutions.
* **Data Export**: One-click CSV export of contest standings, detailed score breakdowns, and audit logs.

---

## 🏗️ System Architecture

```
                                  ┌───────────────────────────┐
                                  │      React Frontend       │
                                  │   (Vite + Monaco IDE +    │
                                  │    Socket.io Client)      │
                                  └─────────────┬─────────────┘
                                                │ HTTPS / WSS
                                                ▼
                                  ┌───────────────────────────┐
                                  │   Node.js / Express API   │
                                  │   (JWT Auth, RBAC, WS Hub,│
                                  │   Timer Sweeper Daemon)   │
                                  └─────────────┬─────────────┘
                                                │
                 ┌──────────────────────────────┼──────────────────────────────┐
                 ▼                              ▼                              ▼
      ┌────────────────────┐         ┌────────────────────┐         ┌────────────────────┐
      │  PostgreSQL RDBMS  │         │  Compiler Engine   │         │    Redis Cache     │
      │ (Users, Problems,  │         │ Dockerized iverilog│         │ (BullMQ Job Queue, │
      │ Submissions, Logs) │         │  / vvp Simulation  │         │ Socket Pub/Sub)    │
      └────────────────────┘         └────────────────────┘         └────────────────────┘
```

---

## 📁 Repository Directory Structure

```
.
├── backend/
│   ├── compiler-docker/        # Dockerfile & shell wrapper for isolated iverilog runner
│   ├── src/
│   │   ├── controllers/        # Express route controllers (auth, problem, submission, admin)
│   │   ├── middleware/         # Auth, RBAC, and rate limiter middleware
│   │   ├── routes/             # RESTful API route definitions
│   │   ├── services/           # Compiler service, timer sweeper, plagiarism analyzer
│   │   ├── utils/              # JWT, logger, and DB connection pool helpers
│   │   └── server.js           # Express app entrypoint & Socket.io server initialization
├── db/
│   ├── schema.sql              # PostgreSQL relational database schema
│   └── init.sql                # Seed problems, testbenches, and initial admin accounts
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable UI components (Navbar, Timer, Modal, Leaderboard)
│   │   ├── pages/              # Views (Login, Dashboard, Contest IDE, Admin Panel)
│   │   ├── services/           # Axios API client & Socket.io manager
│   │   ├── App.tsx             # Main React Router setup
│   │   └── main.tsx            # React application entrypoint
├── docker-compose.yml          # Container orchestration for Postgres, Redis, & Node Server
├── package.json                # Project dependencies & build scripts
└── README.md                   # System documentation
```

---

## ⚙️ Installation & Setup Guide

### Option 1: Docker Compose (Recommended)

Ensure Docker and Docker Compose are installed on your system.

```bash
# 1. Clone the repository
git clone https://github.com/Sharavanakumar-R/hdl-contest-platform.git
cd hdl-contest-platform

# 2. Launch all services (PostgreSQL, Redis, Backend, Frontend)
docker-compose up --build -d

# 3. Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:3000/api
```

### Option 2: Local Manual Setup

#### Prerequisites
* **Node.js**: v20.x or higher
* **PostgreSQL**: v14.x or higher
* **Icarus Verilog**: `apt-get install -y iverilog` (Linux) or Homebrew (macOS)

#### Step 1: Clone & Install Dependencies
```bash
git clone https://github.com/Sharavanakumar-R/hdl-contest-platform.git
cd hdl-contest-platform
npm install
```

#### Step 2: Environment Configuration
Create a `.env` file in the root directory:
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key
DATABASE_URL=postgres://postgres:postgres@localhost:5432/hdl_contest
```

#### Step 3: Database Initialization
```bash
psql -U postgres -d hdl_contest -f db/schema.sql
psql -U postgres -d hdl_contest -f db/init.sql
```

#### Step 4: Run Application
```bash
# Start backend server and Vite frontend
npm run dev
```

---

## 🧪 Testbench & Verification Verification

Submissions are evaluated against comprehensive Verilog testbenches. Below is an example evaluation pattern executed by the system:

```verilog
// Reference 3-to-8 Decoder Testbench Pattern
module tb_decoder3to8;
  reg [2:0] in;
  wire [7:0] out;
  integer i, passed = 0;

  decoder3to8 uut (
    .in(in),
    .out0(out[0]), .out1(out[1]), .out2(out[2]), .out3(out[3]),
    .out4(out[4]), .out5(out[5]), .out6(out[6]), .out7(out[7])
  );

  initial begin
    for (i = 0; i < 8; i = i + 1) begin
      in = i[2:0]; #10;
      if (out == (1 << i)) passed = passed + 1;
    end
    $display("TESTRESULT %s %0d/8", (passed == 8) ? "PASS" : "FAIL", passed);
  end
endmodule
```

---

## 📡 API Endpoint Overview

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new participant account | No |
| `POST` | `/api/auth/login` | Authenticate user & return JWT | No |
| `GET` | `/api/problems` | Retrieve sequential contest problem set | Yes |
| `GET` | `/api/problems/:id` | Get specific problem details & constraints | Yes |
| `POST` | `/api/submissions` | Submit code for compilation & testbench grading | Yes |
| `GET` | `/api/leaderboard` | Get real-time contest leaderboard | Yes |
| `GET` | `/api/admin/analytics` | Fetch contest summary & plagiarism flags | Admin / Judge |
| `GET` | `/api/admin/export` | Download complete results in CSV format | Admin / Judge |

---

## 👨‍💻 Author & Lead Developer

**Sharavanakumar R**  
*Lead Full-Stack Systems Developer & Hardware Verification Architect*  
📧 Email: sharavanakumar864@gmail.com  

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

