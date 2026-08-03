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
      description: '5 Verilog problems: Questions 1–4 (100 pts each) + Question 5 (230 pts). Good luck!',
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
      title: '3-to-8 Decoder',
      statement_md: 'Design a 3-to-8 binary decoder. This decoder takes a 3-bit binary input and produces an 8-bit one-hot output. The circuit has a 3-bit input (`in`) and eight outputs (`out0` through `out7`). For each possible input value from 000 to 111, exactly one corresponding output is 1 while all others are 0. This is a larger version of the 2-to-4 decoder and is commonly used in memory systems where you need to select one of eight memory locations, chip select logic, or instruction decoding in processors.\n\n### Input/Output Examples:\n- `in = 3\'b000` → `out0 = 1`, others = 0\n- `in = 3\'b011` → `out3 = 1`, others = 0\n- `in = 3\'b111` → `out7 = 1`, others = 0\n\n### Constraints\n- Module name must be: `decoder3to8`\n- Input port: `in` (3-bit)\n- Output ports: `out0` through `out7` (all single-bit)\n- Exactly one output is 1, rest are 0',
      difficulty: 'easy',
      points: 100,
      starter_code: 'module decoder3to8(\n  input [2:0] in,\n  output out0,\n  output out1,\n  output out2,\n  output out3,\n  output out4,\n  output out5,\n  output out6,\n  output out7\n);\n  // TODO: Implement 3-to-8 binary decoder\nendmodule\n',
      testbench_code: 'module decoder3to8_tb;\n  reg [2:0] in;\n  wire out0, out1, out2, out3, out4, out5, out6, out7;\n\n  decoder3to8 dut(\n    .in(in),\n    .out0(out0), .out1(out1), .out2(out2), .out3(out3),\n    .out4(out4), .out5(out5), .out6(out6), .out7(out7)\n  );\n\n  initial begin\n    in = 3\'b000; #10;\n    in = 3\'b001; #10;\n    in = 3\'b010; #10;\n    in = 3\'b011; #10;\n    in = 3\'b100; #10;\n    in = 3\'b101; #10;\n    in = 3\'b110; #10;\n    in = 3\'b111; #10;\n    $finish;\n  end\nendmodule\n',
      top_module: 'decoder3to8',
      created_at: now,
    },
    {
      id: '20000000-0000-0000-0000-000000000002',
      contest_id: contestId,
      sequence_no: 2,
      title: '8-to-1 Multiplexer',
      statement_md: 'Design an 8-to-1 multiplexer. The circuit selects one of eight input signals using a 3-bit select input and sends it to the output.\n\n### Input/Output Examples:\n- `sel = 3\'b000` → `y = d0`\n- `sel = 3\'b101` → `y = d5`\n- `sel = 3\'b111` → `y = d7`\n\n### Constraints\n- Module name must be: `mux8to1`\n- Input ports: `d0`, `d1`, `d2`, `d3`, `d4`, `d5`, `d6`, `d7` (all single-bit) and `sel` (3-bit)\n- Output port: `y` (single-bit)\n- Output equals the selected input',
      difficulty: 'easy',
      points: 100,
      starter_code: 'module mux8to1(\n  input d0,\n  input d1,\n  input d2,\n  input d3,\n  input d4,\n  input d5,\n  input d6,\n  input d7,\n  input [2:0] sel,\n  output y\n);\n  // TODO: Implement 8-to-1 multiplexer\nendmodule\n',
      testbench_code: 'module mux8to1_tb;\n  reg d0, d1, d2, d3, d4, d5, d6, d7;\n  reg [2:0] sel;\n  wire y;\n\n  mux8to1 dut(\n    .d0(d0), .d1(d1), .d2(d2), .d3(d3),\n    .d4(d4), .d5(d5), .d6(d6), .d7(d7),\n    .sel(sel), .y(y)\n  );\n\n  initial begin\n    d0=1; d1=0; d2=1; d3=0; d4=1; d5=0; d6=1; d7=0;\n    sel = 3\'b000; #10;\n    sel = 3\'b001; #10;\n    sel = 3\'b010; #10;\n    sel = 3\'b011; #10;\n    sel = 3\'b100; #10;\n    sel = 3\'b101; #10;\n    sel = 3\'b110; #10;\n    sel = 3\'b111; #10;\n    $finish;\n  end\nendmodule\n',
      top_module: 'mux8to1',
      created_at: now,
    },
    {
      id: '20000000-0000-0000-0000-000000000003',
      contest_id: contestId,
      sequence_no: 3,
      title: '4-bit Ring Counter',
      statement_md: 'Design a 4-bit ring counter. A special shift register where the output feeds back to input, creating a rotating pattern. Used in sequence generation and LED chasers.\n\n### Input/Output Examples:\n- **Reset (`rst = 1`)**: `count = 4\'b0001`\n- **Clock tick 1**: `count = 4\'b0010`\n- **Clock tick 2**: `count = 4\'b0100`\n- **Clock tick 3**: `count = 4\'b1000`\n- **Clock tick 4**: `count = 4\'b0001` (repeats)\n\n### Constraints\n- Module name must be: `ring_counter`\n- Input ports: `clk` (single-bit clock), `rst` (single-bit reset)\n- Output port: `count` (4-bit output, `reg [3:0]`)\n- Initialize / reset to `4\'b0001` on active reset (`rst`)',
      difficulty: 'medium',
      points: 100,
      starter_code: 'module ring_counter(\n    input clk,\n    input rst,\n    output reg [3:0] count\n);\n    // write code here\n\nendmodule\n',
      testbench_code: 'module ring_counter_tb;\n  reg clk, rst;\n  wire [3:0] count;\n\n  ring_counter dut(.clk(clk), .rst(rst), .count(count));\n\n  initial begin\n    clk = 0;\n    forever #5 clk = ~clk;\n  end\n\n  initial begin\n    rst = 1; #12;\n    rst = 0; #50;\n    $finish;\n  end\nendmodule\n',
      top_module: 'ring_counter',
      created_at: now,
    },
    {
      id: '20000000-0000-0000-0000-000000000004',
      contest_id: contestId,
      sequence_no: 4,
      title: 'Frequency Divider (Divide by 2)',
      statement_md: 'Design a frequency divider that outputs a clock signal at half the input frequency. The output toggles every input clock edge. Critical in clock generation circuits.\n\n### Input/Output Examples:\n- **Input clock pattern**: `↑↓↑↓↑↓↑↓`\n- **Output clock pattern**: `↑__↑__↑__↑` (half frequency)\n\n### Constraints\n- Module name must be: `freq_div_2`\n- Input ports: `clk_in` (single-bit clock), `rst` (single-bit reset)\n- Output port: `clk_out` (single-bit `reg` output)\n- `clk_out` frequency = `clk_in` / 2 (toggles on every active edge of `clk_in`, initialized or reset to 0 on `rst`)',
      difficulty: 'hard',
      points: 100,
      starter_code: 'module freq_div_2(\n    input clk_in,\n    input rst,\n    output reg clk_out\n);\n    // write code here\n\nendmodule\n',
      testbench_code: 'module freq_div_2_tb;\n  reg clk_in, rst;\n  wire clk_out;\n\n  freq_div_2 dut(.clk_in(clk_in), .rst(rst), .clk_out(clk_out));\n\n  initial begin\n    clk_in = 0;\n    forever #5 clk_in = ~clk_in;\n  end\n\n  initial begin\n    rst = 1; #12;\n    rst = 0; #80;\n    $finish;\n  end\nendmodule\n',
      top_module: 'freq_div_2',
      created_at: now,
    },
    {
      id: '20000000-0000-0000-0000-000000000005',
      contest_id: contestId,
      sequence_no: 5,
      title: 'Bidirectional Shift Register',
      statement_md: 'Design an 8-bit bidirectional shift register. Can shift left or right based on direction signal (`dir`), load parallel data (`load`), or reset to zero (`rst`). Essential for flexible data manipulation.\n\n<div class="circuit-diagram-container" style="margin: 1.25rem 0; background: #0b0f19; border: 1px solid #1e293b; border-radius: 12px; padding: 1.25rem; overflow-x: auto; box-shadow: 0 8px 24px rgba(0,0,0,0.5);"><div style="font-weight: 700; color: #38bdf8; margin-bottom: 0.85rem; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; justify-content: space-between;"><div style="display: flex; align-items: center; gap: 0.5rem;"><span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981;"></span>RTL Logic Schematic: 8-Bit Bidirectional Shift Register (<code style="color: #f43f5e; background: #1e1b4b; padding: 2px 6px; border-radius: 4px;">bidirectional_shift_reg</code>)</div><span style="font-size: 0.75rem; color: #94a3b8; font-weight: normal;">DIR=0: Shift Right | DIR=1: Shift Left | LOAD=1: Parallel Load</span></div><svg viewBox="0 0 1080 470" width="100%" style="min-width: 980px; display: block; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;"><rect x="5" y="5" width="1070" height="460" rx="10" fill="#0f172a" stroke="#334155" stroke-width="2"/><text x="25" y="32" font-size="13" font-weight="bold" fill="#38bdf8">RTL SCHEMATIC ARCHITECTURE: 8-BIT BIDIRECTIONAL SHIFT REGISTER</text><g transform="translate(680, 15)"><rect x="0" y="0" width="385" height="98" rx="8" fill="#1e1b4b" stroke="#6366f1" stroke-width="1.5"/><text x="12" y="20" font-size="11" font-weight="bold" fill="#38bdf8">SHIFT REG BEHAVIORAL EQUATIONS:</text><text x="12" y="38" font-size="10" font-weight="bold" fill="#f43f5e">RST  = 1 : shift_reg &lt;= 8\'b00000000</text><text x="12" y="54" font-size="10" font-weight="bold" fill="#10b981">LOAD = 1 : shift_reg &lt;= parallel_in[7:0]</text><text x="12" y="70" font-size="10" font-weight="bold" fill="#fbbf24">DIR  = 0 : shift_reg &lt;= {serial_in, shift_reg[7:1]}  (Right)</text><text x="12" y="86" font-size="10" font-weight="bold" fill="#38bdf8">DIR  = 1 : shift_reg &lt;= {shift_reg[6:0], serial_in}  (Left)</text></g><g transform="translate(25, 45)"><line x1="0" y1="10" x2="30" y2="10" stroke="#10b981" stroke-width="2.5"/><circle cx="0" cy="10" r="3" fill="#10b981"/><text x="38" y="14" font-size="10" font-weight="bold" fill="#34d399">LOAD (Parallel Select)</text><line x1="0" y1="28" x2="30" y2="28" stroke="#06b6d4" stroke-width="2.5"/><circle cx="0" cy="28" r="3" fill="#06b6d4"/><text x="38" y="32" font-size="10" font-weight="bold" fill="#38bdf8">DIR (0=Right →, 1=Left ←)</text><line x1="0" y1="46" x2="30" y2="46" stroke="#fbbf24" stroke-width="2.5"/><circle cx="0" cy="46" r="3" fill="#fbbf24"/><text x="38" y="50" font-size="10" font-weight="bold" fill="#fcd34d">SERIAL_IN (Shift Bit In)</text><line x1="280" y1="10" x2="310" y2="10" stroke="#6366f1" stroke-width="2.5"/><circle cx="280" cy="10" r="3" fill="#6366f1"/><text x="318" y="14" font-size="10" font-weight="bold" fill="#818cf8">CLK (Clock Edge ↑)</text><line x1="280" y1="28" x2="310" y2="28" stroke="#f43f5e" stroke-width="2.5"/><circle cx="280" cy="28" r="3" fill="#f43f5e"/><text x="318" y="32" font-size="10" font-weight="bold" fill="#fb7185">RST (Sync Reset)</text></g><line x1="25" y1="125" x2="1040" y2="125" stroke="#10b981" stroke-width="3"/><text x="25" y="118" font-size="11" font-weight="bold" fill="#34d399">PARALLEL_IN[7:0] (8-Bit Parallel Input Bus)</text><line x1="25" y1="410" x2="1040" y2="410" stroke="#6366f1" stroke-width="2"/><text x="25" y="405" font-size="10" font-weight="bold" fill="#818cf8">GLOBAL CLK</text><line x1="25" y1="435" x2="1040" y2="435" stroke="#f43f5e" stroke-width="2"/><text x="25" y="430" font-size="10" font-weight="bold" fill="#fb7185">GLOBAL RST</text><line x1="25" y1="150" x2="1040" y2="150" stroke="#10b981" stroke-width="1.5" stroke-dasharray="4,2"/><line x1="25" y1="165" x2="1040" y2="165" stroke="#06b6d4" stroke-width="1.5" stroke-dasharray="4,2"/><path d="M 25 185 L 40 185 L 40 230 L 40 230" stroke="#fbbf24" stroke-width="2" fill="none"/><circle cx="25" cy="185" r="4" fill="#fbbf24"/><text x="30" y="180" font-size="9" font-weight="bold" fill="#fcd34d">SERIAL_IN (Right → Bit 7 MSB)</text><path d="M 1040 185 L 915 185 L 915 250" stroke="#fbbf24" stroke-width="2" fill="none"/><circle cx="1040" cy="185" r="4" fill="#fbbf24"/><text x="1035" y="180" font-size="9" font-weight="bold" fill="#fcd34d" text-anchor="end">SERIAL_IN (Left ← Bit 0 LSB)</text><g transform="translate(40,200)"><line x1="15" y1="-75" x2="15" y2="5" stroke="#10b981" stroke-width="1.5"/><polygon points="0,5 32,12 32,68 0,75" fill="#032b45" stroke="#06b6d4" stroke-width="1.5"/><text x="16" y="44" font-size="9" font-weight="bold" fill="#38bdf8" text-anchor="middle">MUX[7]</text><line x1="32" y1="40" x2="48" y2="40" stroke="#e2e8f0" stroke-width="1.5"/><rect x="48" y="5" width="44" height="70" rx="4" fill="#2d124d" stroke="#a855f7" stroke-width="1.5"/><text x="70" y="35" font-size="10" font-weight="bold" fill="#c084fc" text-anchor="middle">DFF[7]</text><text x="70" y="52" font-size="8" fill="#a7f3d0" text-anchor="middle">Bit 7</text><polygon points="48,60 55,65 48,70" fill="none" stroke="#6366f1" stroke-width="1.5"/><line x1="52" y1="210" x2="52" y2="75" stroke="#6366f1" stroke-width="1.5"/><line x1="78" y1="235" x2="78" y2="75" stroke="#f43f5e" stroke-width="1.5"/><line x1="92" y1="40" x2="92" y2="160" stroke="#10b981" stroke-width="2"/><circle cx="92" cy="40" r="3" fill="#10b981"/><text x="92" y="152" font-size="9" font-weight="bold" fill="#34d399">out[7]</text></g><g transform="translate(165,200)"><line x1="15" y1="-75" x2="15" y2="5" stroke="#10b981" stroke-width="1.5"/><polygon points="0,5 32,12 32,68 0,75" fill="#032b45" stroke="#06b6d4" stroke-width="1.5"/><text x="16" y="44" font-size="9" font-weight="bold" fill="#38bdf8" text-anchor="middle">MUX[6]</text><line x1="32" y1="40" x2="48" y2="40" stroke="#e2e8f0" stroke-width="1.5"/><rect x="48" y="5" width="44" height="70" rx="4" fill="#2d124d" stroke="#a855f7" stroke-width="1.5"/><text x="70" y="35" font-size="10" font-weight="bold" fill="#c084fc" text-anchor="middle">DFF[6]</text><text x="70" y="52" font-size="8" fill="#a7f3d0" text-anchor="middle">Bit 6</text><polygon points="48,60 55,65 48,70" fill="none" stroke="#6366f1" stroke-width="1.5"/><line x1="52" y1="210" x2="52" y2="75" stroke="#6366f1" stroke-width="1.5"/><line x1="78" y1="235" x2="78" y2="75" stroke="#f43f5e" stroke-width="1.5"/><line x1="92" y1="40" x2="92" y2="160" stroke="#10b981" stroke-width="2"/><circle cx="92" cy="40" r="3" fill="#10b981"/><text x="92" y="152" font-size="9" font-weight="bold" fill="#34d399">out[6]</text></g><g transform="translate(290,200)"><line x1="15" y1="-75" x2="15" y2="5" stroke="#10b981" stroke-width="1.5"/><polygon points="0,5 32,12 32,68 0,75" fill="#032b45" stroke="#06b6d4" stroke-width="1.5"/><text x="16" y="44" font-size="9" font-weight="bold" fill="#38bdf8" text-anchor="middle">MUX[5]</text><line x1="32" y1="40" x2="48" y2="40" stroke="#e2e8f0" stroke-width="1.5"/><rect x="48" y="5" width="44" height="70" rx="4" fill="#2d124d" stroke="#a855f7" stroke-width="1.5"/><text x="70" y="35" font-size="10" font-weight="bold" fill="#c084fc" text-anchor="middle">DFF[5]</text><text x="70" y="52" font-size="8" fill="#a7f3d0" text-anchor="middle">Bit 5</text><polygon points="48,60 55,65 48,70" fill="none" stroke="#6366f1" stroke-width="1.5"/><line x1="52" y1="210" x2="52" y2="75" stroke="#6366f1" stroke-width="1.5"/><line x1="78" y1="235" x2="78" y2="75" stroke="#f43f5e" stroke-width="1.5"/><line x1="92" y1="40" x2="92" y2="160" stroke="#10b981" stroke-width="2"/><circle cx="92" cy="40" r="3" fill="#10b981"/><text x="92" y="152" font-size="9" font-weight="bold" fill="#34d399">out[5]</text></g><g transform="translate(415,200)"><line x1="15" y1="-75" x2="15" y2="5" stroke="#10b981" stroke-width="1.5"/><polygon points="0,5 32,12 32,68 0,75" fill="#032b45" stroke="#06b6d4" stroke-width="1.5"/><text x="16" y="44" font-size="9" font-weight="bold" fill="#38bdf8" text-anchor="middle">MUX[4]</text><line x1="32" y1="40" x2="48" y2="40" stroke="#e2e8f0" stroke-width="1.5"/><rect x="48" y="5" width="44" height="70" rx="4" fill="#2d124d" stroke="#a855f7" stroke-width="1.5"/><text x="70" y="35" font-size="10" font-weight="bold" fill="#c084fc" text-anchor="middle">DFF[4]</text><text x="70" y="52" font-size="8" fill="#a7f3d0" text-anchor="middle">Bit 4</text><polygon points="48,60 55,65 48,70" fill="none" stroke="#6366f1" stroke-width="1.5"/><line x1="52" y1="210" x2="52" y2="75" stroke="#6366f1" stroke-width="1.5"/><line x1="78" y1="235" x2="78" y2="75" stroke="#f43f5e" stroke-width="1.5"/><line x1="92" y1="40" x2="92" y2="160" stroke="#10b981" stroke-width="2"/><circle cx="92" cy="40" r="3" fill="#10b981"/><text x="92" y="152" font-size="9" font-weight="bold" fill="#34d399">out[4]</text></g><g transform="translate(540,200)"><line x1="15" y1="-75" x2="15" y2="5" stroke="#10b981" stroke-width="1.5"/><polygon points="0,5 32,12 32,68 0,75" fill="#032b45" stroke="#06b6d4" stroke-width="1.5"/><text x="16" y="44" font-size="9" font-weight="bold" fill="#38bdf8" text-anchor="middle">MUX[3]</text><line x1="32" y1="40" x2="48" y2="40" stroke="#e2e8f0" stroke-width="1.5"/><rect x="48" y="5" width="44" height="70" rx="4" fill="#2d124d" stroke="#a855f7" stroke-width="1.5"/><text x="70" y="35" font-size="10" font-weight="bold" fill="#c084fc" text-anchor="middle">DFF[3]</text><text x="70" y="52" font-size="8" fill="#a7f3d0" text-anchor="middle">Bit 3</text><polygon points="48,60 55,65 48,70" fill="none" stroke="#6366f1" stroke-width="1.5"/><line x1="52" y1="210" x2="52" y2="75" stroke="#6366f1" stroke-width="1.5"/><line x1="78" y1="235" x2="78" y2="75" stroke="#f43f5e" stroke-width="1.5"/><line x1="92" y1="40" x2="92" y2="160" stroke="#10b981" stroke-width="2"/><circle cx="92" cy="40" r="3" fill="#10b981"/><text x="92" y="152" font-size="9" font-weight="bold" fill="#34d399">out[3]</text></g><g transform="translate(665,200)"><line x1="15" y1="-75" x2="15" y2="5" stroke="#10b981" stroke-width="1.5"/><polygon points="0,5 32,12 32,68 0,75" fill="#032b45" stroke="#06b6d4" stroke-width="1.5"/><text x="16" y="44" font-size="9" font-weight="bold" fill="#38bdf8" text-anchor="middle">MUX[2]</text><line x1="32" y1="40" x2="48" y2="40" stroke="#e2e8f0" stroke-width="1.5"/><rect x="48" y="5" width="44" height="70" rx="4" fill="#2d124d" stroke="#a855f7" stroke-width="1.5"/><text x="70" y="35" font-size="10" font-weight="bold" fill="#c084fc" text-anchor="middle">DFF[2]</text><text x="70" y="52" font-size="8" fill="#a7f3d0" text-anchor="middle">Bit 2</text><polygon points="48,60 55,65 48,70" fill="none" stroke="#6366f1" stroke-width="1.5"/><line x1="52" y1="210" x2="52" y2="75" stroke="#6366f1" stroke-width="1.5"/><line x1="78" y1="235" x2="78" y2="75" stroke="#f43f5e" stroke-width="1.5"/><line x1="92" y1="40" x2="92" y2="160" stroke="#10b981" stroke-width="2"/><circle cx="92" cy="40" r="3" fill="#10b981"/><text x="92" y="152" font-size="9" font-weight="bold" fill="#34d399">out[2]</text></g><g transform="translate(790,200)"><line x1="15" y1="-75" x2="15" y2="5" stroke="#10b981" stroke-width="1.5"/><polygon points="0,5 32,12 32,68 0,75" fill="#032b45" stroke="#06b6d4" stroke-width="1.5"/><text x="16" y="44" font-size="9" font-weight="bold" fill="#38bdf8" text-anchor="middle">MUX[1]</text><line x1="32" y1="40" x2="48" y2="40" stroke="#e2e8f0" stroke-width="1.5"/><rect x="48" y="5" width="44" height="70" rx="4" fill="#2d124d" stroke="#a855f7" stroke-width="1.5"/><text x="70" y="35" font-size="10" font-weight="bold" fill="#c084fc" text-anchor="middle">DFF[1]</text><text x="70" y="52" font-size="8" fill="#a7f3d0" text-anchor="middle">Bit 1</text><polygon points="48,60 55,65 48,70" fill="none" stroke="#6366f1" stroke-width="1.5"/><line x1="52" y1="210" x2="52" y2="75" stroke="#6366f1" stroke-width="1.5"/><line x1="78" y1="235" x2="78" y2="75" stroke="#f43f5e" stroke-width="1.5"/><line x1="92" y1="40" x2="92" y2="160" stroke="#10b981" stroke-width="2"/><circle cx="92" cy="40" r="3" fill="#10b981"/><text x="92" y="152" font-size="9" font-weight="bold" fill="#34d399">out[1]</text></g><g transform="translate(915,200)"><line x1="15" y1="-75" x2="15" y2="5" stroke="#10b981" stroke-width="1.5"/><polygon points="0,5 32,12 32,68 0,75" fill="#032b45" stroke="#06b6d4" stroke-width="1.5"/><text x="16" y="44" font-size="9" font-weight="bold" fill="#38bdf8" text-anchor="middle">MUX[0]</text><line x1="32" y1="40" x2="48" y2="40" stroke="#e2e8f0" stroke-width="1.5"/><rect x="48" y="5" width="44" height="70" rx="4" fill="#2d124d" stroke="#a855f7" stroke-width="1.5"/><text x="70" y="35" font-size="10" font-weight="bold" fill="#c084fc" text-anchor="middle">DFF[0]</text><text x="70" y="52" font-size="8" fill="#a7f3d0" text-anchor="middle">Bit 0</text><polygon points="48,60 55,65 48,70" fill="none" stroke="#6366f1" stroke-width="1.5"/><line x1="52" y1="210" x2="52" y2="75" stroke="#6366f1" stroke-width="1.5"/><line x1="78" y1="235" x2="78" y2="75" stroke="#f43f5e" stroke-width="1.5"/><line x1="92" y1="40" x2="92" y2="160" stroke="#10b981" stroke-width="2"/><circle cx="92" cy="40" r="3" fill="#10b981"/><text x="92" y="152" font-size="9" font-weight="bold" fill="#34d399">out[0]</text></g><path d="M 132 240 L 165 230 M 257 240 L 290 230 M 382 240 L 415 230 M 507 240 L 540 230 M 632 240 L 665 230 M 757 240 L 790 230 M 882 240 L 915 230" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="3,2"/><line x1="25" y1="360" x2="1040" y2="360" stroke="#10b981" stroke-width="3"/><text x="25" y="375" font-size="11" font-weight="bold" fill="#34d399">PARALLEL_OUT[7:0] (8-Bit Parallel Output Bus)</text></svg></div>\n\n### Input/Output Examples:\n- **`dir = 0` (Right shift)**: `10110011` with `serial_in = 0` -> `01011001`\n- **`dir = 1` (Left shift)**: `10110011` with `serial_in = 0` -> `01100110`\n- **`load = 1`**: Directly loads `parallel_in` into register\n\n### Constraints\n- Module name must be: `bidirectional_shift_reg`\n- Input ports: `clk`, `rst`, `dir`, `serial_in`, `load`, `parallel_in[7:0]`\n- Output port: `parallel_out[7:0]`\n- `dir = 0`: Shift right (`{serial_in, shift_reg[7:1]}`)\n- `dir = 1`: Shift left (`{shift_reg[6:0], serial_in}`)',
      difficulty: 'medium',
      points: 230,
      starter_code: 'module bidirectional_shift_reg(\n    input clk,\n    input rst,\n    input dir,\n    input serial_in,\n    input load,\n    input [7:0] parallel_in,\n    output [7:0] parallel_out\n);\n    reg [7:0] shift_reg;\n    assign parallel_out = shift_reg;\n    \n    // write code here\n    \nendmodule\n',
      testbench_code: 'module bidirectional_shift_reg_tb;\n  reg clk, rst, dir, serial_in, load;\n  reg [7:0] parallel_in;\n  wire [7:0] parallel_out;\n\n  bidirectional_shift_reg dut(\n    .clk(clk), .rst(rst), .dir(dir),\n    .serial_in(serial_in), .load(load),\n    .parallel_in(parallel_in), .parallel_out(parallel_out)\n  );\n\n  initial begin\n    clk = 0;\n    forever #5 clk = ~clk;\n  end\n\n  initial begin\n    rst = 1; load = 0; dir = 0; serial_in = 0; parallel_in = 8\'b0; #12;\n    rst = 0; load = 1; parallel_in = 8\'b10110011; #10;\n    load = 0; dir = 0; serial_in = 0; #10; // right shift\n    dir = 1; serial_in = 0; #10; // left shift\n    $finish;\n  end\nendmodule\n',
      top_module: 'bidirectional_shift_reg',
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
      const pa = memoryDb.problem_attempts.find((x) => x.id === s.attempt_id) || {};
      let duration_seconds = null;
      if (s.submitted_at && pa.started_at) {
        duration_seconds = Math.max(0, Math.round((new Date(s.submitted_at).getTime() - new Date(pa.started_at).getTime()) / 1000));
      }
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
        attempt_started_at: pa.started_at,
        duration_seconds,
      };
    });
    subs.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
    return { rows: subs, rowCount: subs.length };
  }
  if (sqlUpper.includes('FROM SUBMISSIONS WHERE ID = $1')) {
    const sub = memoryDb.submissions.find((x) => x.id === params[0]);
    return { rows: sub ? [sub] : [], rowCount: sub ? 1 : 0 };
  }

  // --- ANALYTICS ---
  if (sqlUpper.includes('FROM CONTEST_RUNS') && sqlUpper.includes('COUNT(*)')) {
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

  // --- LEADERBOARD ---
  if (sqlUpper.includes('FROM LEADERBOARD') || (sqlUpper.includes('FROM CONTEST_RUNS') && (sqlUpper.includes('JOIN USERS') || sqlUpper.includes('PARTICIPANT_ID') || sqlUpper.includes('LEADERBOARD')))) {
    const runs = memoryDb.contest_runs.filter((r) => r.contest_id === params[0]);
    const rows = runs.map((cr) => {
      const u = memoryDb.users.find((x) => x.id === cr.user_id) || {};
      let duration_seconds = null;
      if (cr.started_at) {
        const endTime = cr.completed_at ? new Date(cr.completed_at).getTime() : Date.now();
        duration_seconds = Math.max(0, Math.round((endTime - new Date(cr.started_at).getTime()) / 1000));
      }
      return {
        participant_id: u.participant_id,
        name: u.name,
        contest_id: cr.contest_id,
        total_score: cr.total_score || 0,
        started_at: cr.started_at,
        completed_at: cr.completed_at,
        duration_seconds,
        status: cr.status,
      };
    });
    rows.sort((a, b) => {
      if ((b.total_score || 0) !== (a.total_score || 0)) return (b.total_score || 0) - (a.total_score || 0);
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
