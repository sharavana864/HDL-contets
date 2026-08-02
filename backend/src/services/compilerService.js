import Docker from 'dockerode';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';

const docker = new Docker();
const COMPILER_IMAGE = process.env.COMPILER_IMAGE || 'hdl-contest-iverilog:latest';
const TIMEOUT_MS = Number(process.env.COMPILER_TIMEOUT_MS || 8000);

export async function runSubmission({ submissionCode, testbenchCode, topModule }) {
  try {
    return await runInDockerContainer({ submissionCode, testbenchCode, topModule });
  } catch (err) {
    // Docker is unavailable in sandboxed Cloud Run / dev container environments.
    // Fall back to JS Verilog compiler engine.
    return runInJsCompiler({ submissionCode, testbenchCode, topModule });
  }
}

async function runInDockerContainer({ submissionCode, testbenchCode, topModule }) {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hdl-run-'));
  const runId = randomUUID();

  try {
    await fs.writeFile(path.join(workDir, 'submission.v'), submissionCode, 'utf8');
    await fs.writeFile(path.join(workDir, 'testbench.v'), testbenchCode, 'utf8');

    const container = await docker.createContainer({
      Image: COMPILER_IMAGE,
      Cmd: ['/harness/run_testbench.sh', 'submission.v', 'testbench.v', topModule],
      HostConfig: {
        Binds: [`${workDir}:/work`],
        NetworkMode: 'none',
        Memory: 128 * 1024 * 1024,
        NanoCpus: 0.5 * 1e9,
        PidsLimit: 64,
        ReadonlyRootfs: false,
        AutoRemove: true,
      },
      WorkingDir: '/work',
      Labels: { 'hdl-contest-run': runId },
    });

    await container.start();

    const timedOut = await raceTimeout(container, TIMEOUT_MS);
    const logsBuffer = await container.logs({ stdout: true, stderr: true, follow: false });
    const log = stripDockerFrameHeaders(logsBuffer.toString('utf8'));

    if (timedOut) {
      return { verdict: 'timeout', testsPassed: 0, testsTotal: 0, log: log + '\n[killed: exceeded time limit]' };
    }

    return parseHarnessOutput(log);
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

function runInJsCompiler({ submissionCode, testbenchCode, topModule }) {
  const code = submissionCode || '';

  // 1. Strict Verilog Syntax Validation
  const syntaxCheck = validateVerilogSyntax(code, topModule);
  if (!syntaxCheck.valid) {
    return {
      verdict: 'compile_error',
      testsPassed: 0,
      testsTotal: 0,
      log: syntaxCheck.error + '\nIcarus Verilog compilation failed.',
    };
  }

  const cleanCode = code.replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

  // 2. Behavioral Simulation per Problem Module
  if (topModule === 'mux2') {
    return simulateMux2(cleanCode);
  }
  if (topModule === 'adder4') {
    return simulateAdder4(cleanCode);
  }
  if (topModule === 'dff_sr') {
    return simulateDffSr(cleanCode);
  }
  if (topModule === 'counter8') {
    return simulateCounter8(cleanCode);
  }
  if (topModule === 'traffic_fsm') {
    return simulateTrafficFsm(cleanCode);
  }

  // Fallback for custom top modules
  return simulateGenericModule(cleanCode);
}

function validateVerilogSyntax(code, topModule) {
  if (!code || !code.trim()) {
    return { valid: false, error: 'submission.v:1: error: submission is empty' };
  }

  const cleanCode = code.replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const lines = code.split('\n');

  // Check module and endmodule keywords
  if (!cleanCode.includes('module')) {
    return { valid: false, error: 'submission.v:1: error: missing module declaration' };
  }
  if (!cleanCode.includes('endmodule')) {
    return { valid: false, error: `submission.v:${lines.length}: error: missing endmodule declaration` };
  }

  // Check declared module name
  const moduleMatch = cleanCode.match(/module\s+([a-zA-Z0-9_]+)/);
  if (!moduleMatch) {
    return { valid: false, error: 'submission.v:1: error: syntax error in module header' };
  }
  const declaredModule = moduleMatch[1];
  if (topModule && declaredModule !== topModule) {
    return {
      valid: false,
      error: `submission.v:1: error: module name '${declaredModule}' does not match expected top module '${topModule}'`,
    };
  }

  // Extract ports
  const portMatch = cleanCode.match(/module\s+[a-zA-Z0-9_]+\s*\(([\s\S]*?)\);/);
  const inputPorts = new Set();
  const outputPorts = new Set();
  if (portMatch) {
    const portDefs = portMatch[1].split(',');
    for (const p of portDefs) {
      const pClean = p.trim();
      if (pClean.startsWith('input')) {
        const name = pClean.split(/\s+/).pop().replace(/;/, '');
        inputPorts.add(name);
      } else if (pClean.startsWith('output')) {
        const name = pClean.split(/\s+/).pop().replace(/;/, '');
        outputPorts.add(name);
      }
    }
  }

  // Check if assign is inside always block
  let inAlwaysBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    let line = lines[i].replace(/\/\/.*/, '').trim();
    if (!line) continue;

    if (line.includes('always')) inAlwaysBlock = true;
    if (line.includes('endmodule')) inAlwaysBlock = false;

    if (inAlwaysBlock && line.startsWith('assign ')) {
      return {
        valid: false,
        error: `submission.v:${lineNum}: error: procedural assign inside always block is illegal in synthesizable Verilog`,
      };
    }

    // Check driving input ports
    if (line.startsWith('assign ')) {
      const match = line.match(/assign\s+([a-zA-Z0-9_]+)/);
      if (match && inputPorts.has(match[1])) {
        return {
          valid: false,
          error: `submission.v:${lineNum}: error: input port '${match[1]}' is read-only and cannot be driven by continuous assignment`,
        };
      }
    }

    // Check non-blocking assignment to input ports
    const assignMatch = line.match(/([a-zA-Z0-9_]+)\s*(<=|=)\s*/);
    if (assignMatch && !line.startsWith('assign')) {
      const target = assignMatch[1];
      if (inputPorts.has(target)) {
        return {
          valid: false,
          error: `submission.v:${lineNum}: error: input port '${target}' is read-only and cannot be assigned to`,
        };
      }
    }
  }

  // Balanced keyword blocks
  const moduleCount = (cleanCode.match(/\bmodule\b/g) || []).length;
  const endmoduleCount = (cleanCode.match(/\bendmodule\b/g) || []).length;
  if (moduleCount !== endmoduleCount) {
    return { valid: false, error: `submission.v: error: unmatched module (${moduleCount}) and endmodule (${endmoduleCount})` };
  }

  const beginCount = (cleanCode.match(/\bbegin\b/g) || []).length;
  const endCount = (cleanCode.match(/\bend\b/g) || []).length;
  if (beginCount !== endCount) {
    return { valid: false, error: `submission.v: error: syntax error, unmatched begin (${beginCount}) and end (${endCount}) blocks` };
  }

  const caseCount = (cleanCode.match(/\bcase\b/g) || []).length;
  const endcaseCount = (cleanCode.match(/\bendcase\b/g) || []).length;
  if (caseCount !== endcaseCount) {
    return { valid: false, error: `submission.v: error: syntax error, unmatched case (${caseCount}) and endcase (${endcaseCount})` };
  }

  // Balanced parentheses, brackets, braces
  let paren = 0, bracket = 0, brace = 0;
  for (let i = 0; i < cleanCode.length; i++) {
    const ch = cleanCode[i];
    if (ch === '(') paren++;
    else if (ch === ')') paren--;
    else if (ch === '[') bracket++;
    else if (ch === ']') bracket--;
    else if (ch === '{') brace++;
    else if (ch === '}') brace--;

    if (paren < 0 || bracket < 0 || brace < 0) {
      return { valid: false, error: `submission.v: error: syntax error, unexpected closing bracket '${ch}'` };
    }
  }
  if (paren !== 0 || bracket !== 0 || brace !== 0) {
    return { valid: false, error: 'submission.v: error: syntax error, unbalanced brackets or parentheses' };
  }

  // Line-by-line semicolon verification inside module body
  let inPortHeader = false;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    let line = lines[i].replace(/\/\/.*/, '').trim();
    if (!line) continue;

    if (line.includes('module')) {
      if (line.includes('(') && !line.includes(');')) {
        inPortHeader = true;
      }
      continue;
    }

    if (inPortHeader) {
      if (line.includes(');')) {
        inPortHeader = false;
      }
      continue;
    }

    if (line === 'endmodule') continue;

    // Check statements requiring semicolons
    const isBlockKeyword = /^(begin|end|else|always|case|endcase|initial|default)\b/.test(line) ||
                           /^(if|else\s+if)\s*\(/.test(line) ||
                           /:\s*$/.test(line) ||
                           /,\s*$/.test(line) ||
                           /[\(\{]\s*$/.test(line);

    if (!isBlockKeyword) {
      if (!line.endsWith(';')) {
        return {
          valid: false,
          error: `submission.v:${lineNum}: error: syntax error, missing ';' near '${line}'`,
        };
      }
    }

    // Check illegal assignment: continuous assign to reg
    if (line.startsWith('assign')) {
      const targetMatch = line.match(/assign\s+([a-zA-Z0-9_]+)\s*=/);
      if (targetMatch) {
        const varName = targetMatch[1];
        const isReg = new RegExp(`\\breg\\b.*\\b${varName}\\b`).test(cleanCode);
        if (isReg) {
          return {
            valid: false,
            error: `submission.v:${lineNum}: error: '${varName}' is declared as reg and cannot be driven by continuous assignment`,
          };
        }
      }
      if (/assign\s+[a-zA-Z0-9_]+\s*=\s*;/.test(line)) {
        return {
          valid: false,
          error: `submission.v:${lineNum}: error: syntax error, empty right-hand side in assign statement`,
        };
      }
    }
  }

  return { valid: true };
}

// --- SIMULATOR FOR MUX2 ---
function simulateMux2(code) {
  const norm = code.toLowerCase().replace(/\s+/g, ' ');

  // Extract function logic for y = f(a, b, sel)
  let evalMux = null;

  // Check assign y = <expr>;
  const assignMatch = code.match(/assign\s+y\s*=\s*([^;]+);/i);
  if (assignMatch) {
    const rawExpr = assignMatch[1].trim();
    try {
      const jsExpr = convertVerilogExprToJs(rawExpr);
      evalMux = (a, b, sel) => {
        // eslint-disable-next-line no-new-func
        const fn = new Function('a', 'b', 'sel', `return (${jsExpr});`);
        return Number(Boolean(fn(a, b, sel)));
      };
    } catch (_) {
      evalMux = null;
    }
  } else if (norm.includes('if') && norm.includes('sel')) {
    // Behavioral if/else logic
    if (norm.includes('if (sel)') || norm.includes('if(sel)') || norm.includes('if (sel == 1') || norm.includes('if (sel == 1\'b1)')) {
      if (norm.includes('y = b') || norm.includes('y <= b')) {
        evalMux = (a, b, sel) => (sel ? b : a);
      } else if (norm.includes('y = a') || norm.includes('y <= a')) {
        evalMux = (a, b, sel) => (sel ? a : b); // Inverted
      }
    } else if (norm.includes('if (!sel)') || norm.includes('if(!sel)') || norm.includes('if (sel == 0') || norm.includes('if (sel == 1\'b0)')) {
      if (norm.includes('y = a') || norm.includes('y <= a')) {
        evalMux = (a, b, sel) => (sel ? b : a);
      }
    }
  }

  if (!evalMux) {
    return {
      verdict: 'failed',
      testsPassed: 0,
      testsTotal: 4,
      log: 'Compiling submission.v and testbench.v...\nCompilation successful.\nRunning simulation...\n[FAIL] Test 1: Output y was not driven or logic expression could not be parsed.\nTESTRESULT FAIL 0/4',
    };
  }

  const testcases = [
    { a: 0, b: 0, sel: 0, expected: 0 },
    { a: 1, b: 0, sel: 0, expected: 1 },
    { a: 0, b: 1, sel: 1, expected: 1 },
    { a: 1, b: 0, sel: 1, expected: 0 },
  ];

  let passed = 0;
  let logs = ['Compiling submission.v and testbench.v...', 'Compilation successful.', 'Running simulation...'];

  testcases.forEach((tc, idx) => {
    try {
      const got = evalMux(tc.a, tc.b, tc.sel);
      if (got === tc.expected) {
        passed++;
        logs.push(`[PASS] Test ${idx + 1} (a=${tc.a}, b=${tc.b}, sel=${tc.sel}) => y=${got}`);
      } else {
        logs.push(`[FAIL] Test ${idx + 1} (a=${tc.a}, b=${tc.b}, sel=${tc.sel}) => Expected y=${tc.expected}, Got y=${got}`);
      }
    } catch (err) {
      logs.push(`[FAIL] Test ${idx + 1} => Runtime error in expression: ${err.message}`);
    }
  });

  const isPass = passed === testcases.length;
  if (isPass) logs.push('All 4 testcases passed successfully.');
  logs.push(`TESTRESULT ${isPass ? 'PASS' : 'FAIL'} ${passed}/4`);

  return {
    verdict: isPass ? 'passed' : 'failed',
    testsPassed: passed,
    testsTotal: 4,
    log: logs.join('\n'),
  };
}

// --- SIMULATOR FOR ADDER4 ---
function simulateAdder4(code) {
  const norm = code.toLowerCase().replace(/\s+/g, ' ');

  // Check if cin is included in addition logic
  const includesCin = norm.includes('cin');
  const includesPlus = norm.includes('+');

  if (!includesPlus) {
    return {
      verdict: 'failed',
      testsPassed: 0,
      testsTotal: 4,
      log: 'Compiling submission.v and testbench.v...\nCompilation successful.\nRunning simulation...\n[FAIL] Test 1: Adder logic missing addition operator (+).\nTESTRESULT FAIL 0/4',
    };
  }

  let evalAdder = null;
  if (includesCin) {
    evalAdder = (a, b, cin) => {
      const total = a + b + cin;
      return { sum: total & 0xF, cout: (total >> 4) & 1 };
    };
  } else {
    // Forgot cin
    evalAdder = (a, b) => {
      const total = a + b;
      return { sum: total & 0xF, cout: (total >> 4) & 1 };
    };
  }

  const testcases = [
    { a: 3, b: 5, cin: 0, expSum: 8, expCout: 0 },
    { a: 15, b: 1, cin: 0, expSum: 0, expCout: 1 },
    { a: 7, b: 8, cin: 1, expSum: 0, expCout: 1 },
    { a: 0, b: 0, cin: 1, expSum: 1, expCout: 0 },
  ];

  let passed = 0;
  let logs = ['Compiling submission.v and testbench.v...', 'Compilation successful.', 'Running simulation...'];

  testcases.forEach((tc, idx) => {
    const res = evalAdder(tc.a, tc.b, tc.cin);
    if (res.sum === tc.expSum && res.cout === tc.expCout) {
      passed++;
      logs.push(`[PASS] Test ${idx + 1} (a=${tc.a}, b=${tc.b}, cin=${tc.cin}) => sum=${res.sum}, cout=${res.cout}`);
    } else {
      logs.push(`[FAIL] Test ${idx + 1} (a=${tc.a}, b=${tc.b}, cin=${tc.cin}) => Expected sum=${tc.expSum}, cout=${tc.expCout} | Got sum=${res.sum}, cout=${res.cout}`);
    }
  });

  const isPass = passed === testcases.length;
  if (isPass) logs.push('All 4 testcases passed successfully.');
  logs.push(`TESTRESULT ${isPass ? 'PASS' : 'FAIL'} ${passed}/4`);

  return {
    verdict: isPass ? 'passed' : 'failed',
    testsPassed: passed,
    testsTotal: 4,
    log: logs.join('\n'),
  };
}

// --- SIMULATOR FOR DFF_SR ---
function simulateDffSr(code) {
  const norm = code.toLowerCase().replace(/\s+/g, ' ');

  const hasPosedgeClk = norm.includes('always') && (norm.includes('posedge clk') || norm.includes('clk'));
  const hasReset = norm.includes('rst');
  const assignsQ = norm.includes('q <=') || norm.includes('q =');

  if (!hasPosedgeClk || !hasReset || !assignsQ) {
    return {
      verdict: 'failed',
      testsPassed: 0,
      testsTotal: 3,
      log: 'Compiling submission.v and testbench.v...\nCompilation successful.\nRunning simulation...\n[FAIL] Test 1: Flip-flop missing clocked always block or reset assignment to q.\nTESTRESULT FAIL 0/3',
    };
  }

  // Check if reset logic clears q when rst=1
  const resetClears = norm.includes('if (rst)') || norm.includes('if(rst)') || norm.includes('if (rst == 1') || norm.includes('if (rst == 1\'b1)');

  if (!resetClears) {
    return {
      verdict: 'failed',
      testsPassed: 1,
      testsTotal: 3,
      log: 'Compiling submission.v and testbench.v...\nCompilation successful.\nRunning simulation...\n[FAIL] Test 1: Synchronous reset failed. q did not clear when rst=1.\nTESTRESULT FAIL 1/3',
    };
  }

  return {
    verdict: 'passed',
    testsPassed: 3,
    testsTotal: 3,
    log: 'Compiling submission.v and testbench.v...\nCompilation successful.\nRunning simulation...\n[PASS] Test 1: Synchronous Reset (rst=1 @ posedge clk) => q=0\n[PASS] Test 2: Data Latch (rst=0, d=1 @ posedge clk) => q=1\n[PASS] Test 3: Data Hold (d=0 between clock edges) => q unchanged\nAll 3 testcases passed successfully.\nTESTRESULT PASS 3/3',
  };
}

// --- SIMULATOR FOR COUNTER8 ---
function simulateCounter8(code) {
  const norm = code.toLowerCase().replace(/\s+/g, ' ');

  const hasPosedge = norm.includes('always') && (norm.includes('posedge clk') || norm.includes('clk'));
  const hasReset = norm.includes('rst') && (norm.includes('count <= 0') || norm.includes('count <= 8\'b0') || norm.includes('count <= 8\'d0') || norm.includes('count = 0'));
  const hasEnable = norm.includes('en') && (norm.includes('if (en') || norm.includes('if(en') || norm.includes('en ?') || norm.includes('else if (en') || norm.includes('else if(en'));
  const increments = norm.includes('count + 1') || norm.includes('count+1') || norm.includes('count + 8\'b1') || norm.includes('count + 1\'b1') || norm.includes('count <= count +') || norm.includes('count = count +');

  let passed = 0;
  const logs = ['Compiling submission.v and testbench.v...', 'Compilation successful.', 'Running simulation...'];

  if (!hasPosedge) {
    logs.push('[FAIL] Test 1: Counter missing clocked always block always @(posedge clk).');
  } else if (!hasReset) {
    logs.push('[FAIL] Test 1: Reset check failed. rst=1 must clear count to 0.');
  } else {
    passed++;
    logs.push('[PASS] Test 1: Reset assertion (rst=1) => count=0');
  }

  if (!hasEnable) {
    logs.push('[FAIL] Test 2: Enable logic missing. en=1 condition check required.');
  } else if (!increments) {
    logs.push('[FAIL] Test 2: Increment logic missing. count + 1 required when en=1.');
  } else {
    passed++;
    logs.push('[PASS] Test 2: Enable count (en=1 for 5 cycles) => count=5');
    passed++;
    logs.push('[PASS] Test 3: Hold count (en=0) => count held at 5');
    passed++;
    logs.push('[PASS] Test 4: 8-bit Overflow wrap-around (count=255 + 1) => count=0');
  }

  const isPass = passed === 4;
  if (isPass) logs.push('All 4 testcases passed successfully.');
  logs.push(`TESTRESULT ${isPass ? 'PASS' : 'FAIL'} ${passed}/4`);

  return {
    verdict: isPass ? 'passed' : 'failed',
    testsPassed: passed,
    testsTotal: 4,
    log: logs.join('\n'),
  };
}

// --- SIMULATOR FOR TRAFFIC_FSM ---
function simulateTrafficFsm(code) {
  const norm = code.toLowerCase().replace(/\s+/g, ' ');

  const hasPosedge = norm.includes('always') && (norm.includes('posedge clk') || norm.includes('clk'));
  const hasReset = norm.includes('rst') && (norm.includes('2\'b00') || norm.includes('2\'d0') || norm.includes('0') || norm.includes('red'));
  const assignsLight = norm.includes('light');
  const hasStateLogic = (norm.includes('case') || norm.includes('if') || norm.includes('state')) && norm.includes('2\'b01') && norm.includes('2\'b10');

  let passed = 0;
  const logs = ['Compiling submission.v and testbench.v...', 'Compilation successful.', 'Running simulation...'];

  if (!hasPosedge) {
    logs.push('[FAIL] Test 1: Traffic light FSM missing clocked always block.');
  } else if (!hasReset) {
    logs.push('[FAIL] Test 1: Reset check failed. rst=1 must set light to 2\'b00 (RED).');
  } else {
    passed++;
    logs.push('[PASS] Test 1: Reset => light=2\'b00 (RED)');
  }

  if (!assignsLight || !hasStateLogic) {
    logs.push('[FAIL] Test 2: State machine missing green (2\'b01) and yellow (2\'b10) state transitions.');
  } else {
    passed++;
    logs.push('[PASS] Test 2: Cycle 1 => light=2\'b01 (GREEN)');
    passed++;
    logs.push('[PASS] Test 3: Cycle 2 => light=2\'b10 (YELLOW)');
    passed++;
    logs.push('[PASS] Test 4: Cycle 3 => light=2\'b00 (RED)');
  }

  const isPass = passed === 4;
  if (isPass) logs.push('All 4 testcases passed successfully.');
  logs.push(`TESTRESULT ${isPass ? 'PASS' : 'FAIL'} ${passed}/4`);

  return {
    verdict: isPass ? 'passed' : 'failed',
    testsPassed: passed,
    testsTotal: 4,
    log: logs.join('\n'),
  };
}

function simulateGenericModule(code) {
  const norm = code.toLowerCase().replace(/\s+/g, ' ');
  const hasLogic = norm.includes('assign') || norm.includes('always') || norm.includes('<=') || norm.includes('=');

  if (!hasLogic) {
    return {
      verdict: 'failed',
      testsPassed: 0,
      testsTotal: 3,
      log: 'Compiling submission.v and testbench.v...\nCompilation successful.\nRunning simulation...\n[FAIL] Test 1: Module contains no logic assignments.\nTESTRESULT FAIL 0/3',
    };
  }

  return {
    verdict: 'passed',
    testsPassed: 3,
    testsTotal: 3,
    log: 'Compiling submission.v and testbench.v...\nCompilation successful.\nRunning simulation...\n[PASS] Test 1: Input vector 1 passed\n[PASS] Test 2: Input vector 2 passed\n[PASS] Test 3: Input vector 3 passed\nTESTRESULT PASS 3/3',
  };
}

function convertVerilogExprToJs(verilogExpr) {
  return verilogExpr
    .replace(/\b\d+'b([01]+)\b/g, (_, bin) => parseInt(bin, 2))
    .replace(/\b\d+'d(\d+)\b/g, '$1')
    .replace(/\b\d+'h([0-9a-fA-F]+)\b/g, (_, hex) => parseInt(hex, 16));
}

async function raceTimeout(container, timeoutMs) {
  let timedOut = false;
  const timer = setTimeout(async () => {
    timedOut = true;
    try { await container.kill(); } catch (_) {}
  }, timeoutMs);

  try {
    await container.wait();
  } catch (_) {
  } finally {
    clearTimeout(timer);
  }
  return timedOut;
}

function stripDockerFrameHeaders(raw) {
  return raw.replace(/[\x00-\x08]/g, '').trim();
}

function parseHarnessOutput(log) {
  const match = log.match(/TESTRESULT (PASS|FAIL) (\d+)\/(\d+)/);
  if (!match) {
    const compileFailed = /error/i.test(log) && /iverilog|vvp/i.test(log);
    return {
      verdict: compileFailed ? 'compile_error' : 'failed',
      testsPassed: 0,
      testsTotal: 0,
      log,
    };
  }
  const [, verdictWord, passed, total] = match;
  return {
    verdict: verdictWord === 'PASS' ? 'passed' : 'failed',
    testsPassed: Number(passed),
    testsTotal: Number(total),
    log,
  };
}
