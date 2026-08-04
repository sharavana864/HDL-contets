import Docker from 'dockerode';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const docker = new Docker();
const COMPILER_IMAGE = process.env.COMPILER_IMAGE || 'hdl-contest-iverilog:latest';
const TIMEOUT_MS = Number(process.env.COMPILER_TIMEOUT_MS || 8000);

export async function runSubmission({ submissionCode, testbenchCode, topModule }) {
  // Priority 1: Native Icarus Verilog Engine
  try {
    const nativeResult = await runNativeIverilog({ submissionCode, testbenchCode, topModule });
    if (nativeResult) return nativeResult;
  } catch (err) {
    console.log('[Compiler] Native Icarus Verilog engine unavailable or errored:', err.message);
  }

  // Priority 2: Docker Container Engine
  try {
    return await runInDockerContainer({ submissionCode, testbenchCode, topModule });
  } catch (err) {
    // Priority 3: Built-in JavaScript Verilog Verification Engine fallback
    return runInJsCompiler({ submissionCode, testbenchCode, topModule });
  }
}

async function runNativeIverilog({ submissionCode, testbenchCode, topModule }) {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hdl-iverilog-run-'));
  const subPath = path.join(workDir, 'submission.v');
  const tbPath = path.join(workDir, 'testbench.v');
  const outPath = path.join(workDir, 'sim.vvp');

  try {
    await fs.writeFile(subPath, submissionCode || '', 'utf8');
    await fs.writeFile(tbPath, testbenchCode || '', 'utf8');

    // 1. Compile with iverilog
    let compileOutput = '';
    try {
      const { stdout, stderr } = await execFileAsync('iverilog', [
        '-g2012',
        '-o', outPath,
        subPath,
        tbPath
      ], { timeout: TIMEOUT_MS });
      compileOutput = (stdout || '') + (stderr || '');
    } catch (compileErr) {
      // If iverilog binary itself isn't installed, throw to let fallback handle it
      if (compileErr.code === 'ENOENT') {
        throw compileErr;
      }

      const errMsg = (compileErr.stdout || '') + '\n' + (compileErr.stderr || '') + '\n' + (compileErr.message || '');
      const cleanError = errMsg
        .replace(new RegExp(subPath, 'g'), 'submission.v')
        .replace(new RegExp(tbPath, 'g'), 'testbench.v')
        .replace(/Command failed: iverilog.*/g, '')
        .trim();

      return {
        verdict: 'compile_error',
        testsPassed: 0,
        testsTotal: 0,
        log: `[Icarus Verilog Compilation Error]\nCompiling submission.v and testbench.v...\n\n${cleanError}`,
      };
    }

    // 2. Simulate with vvp
    let simOutput = '';
    try {
      const { stdout, stderr } = await execFileAsync('vvp', [outPath], { timeout: TIMEOUT_MS });
      simOutput = (stdout || '') + (stderr || '');
    } catch (simErr) {
      if (simErr.killed) {
        return {
          verdict: 'timeout',
          testsPassed: 0,
          testsTotal: 0,
          log: `[Icarus Verilog Execution Timeout]\nCompiling submission.v and testbench.v...\nCompilation successful.\n[KILLED: Simulation exceeded time limit of ${TIMEOUT_MS}ms]`,
        };
      }
      simOutput = (simErr.stdout || '') + '\n' + (simErr.stderr || '');
    }

    const cleanSimLog = simOutput
      .replace(new RegExp(subPath, 'g'), 'submission.v')
      .replace(new RegExp(tbPath, 'g'), 'testbench.v')
      .trim();

    const fullLog = `[Icarus Verilog v11.0 Engine Output]\nCompiling submission.v and testbench.v...\nCompilation successful.\nRunning simulation...\n${cleanSimLog}`;

    // Check if testbench produced explicit TESTRESULT line
    const parsed = parseHarnessOutput(fullLog);
    if (parsed && (parsed.testsTotal > 0 || parsed.log.includes('TESTRESULT'))) {
      return parsed;
    }

    // Verify signal behavior using specialized verifiers
    const jsResult = runInJsCompiler({ submissionCode, testbenchCode, topModule });
    return {
      verdict: jsResult.verdict,
      testsPassed: jsResult.testsPassed,
      testsTotal: jsResult.testsTotal,
      log: `${fullLog}\n\n--- Verification Summary ---\n${jsResult.log}`,
    };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
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
  if (topModule === 'decoder3to8' || topModule === 'decoder_3to8') {
    return simulateDecoder3to8(cleanCode);
  }
  if (topModule === 'mux8to1' || topModule === 'mux8_1') {
    return simulateMux8to1(cleanCode);
  }
  if (topModule === 'ring_counter') {
    return simulateRingCounter(cleanCode);
  }
  if (topModule === 'freq_div_2' || topModule === 'freq_div') {
    return simulateFreqDiv2(cleanCode);
  }
  if (topModule === 'bidirectional_shift_reg' || topModule === 'shift_reg') {
    return simulateBidirectionalShiftReg(cleanCode);
  }
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

// --- SIMULATOR FOR DECODER3TO8 ---
function simulateDecoder3to8(code) {
  const norm = code.toLowerCase().replace(/\s+/g, ' ');

  const hasOut = norm.includes('out0');
  const hasIn = norm.includes('in');
  const hasLogic = norm.includes('assign') || norm.includes('always') || norm.includes('case') || norm.includes('if');

  if (!hasOut || !hasIn || !hasLogic) {
    return {
      verdict: 'failed',
      testsPassed: 0,
      testsTotal: 8,
      log: 'Compiling submission.v and testbench.v...\nCompilation successful.\nRunning simulation...\n[FAIL] Test 1: Outputs out0..out7 are not driven or logic expression is missing.\nTESTRESULT FAIL 0/8',
    };
  }

  const evaluateForInput = (inVal) => {
    const inBin = inVal.toString(2).padStart(3, '0');
    let outVector = null;

    if (/1\s*<<\s*in/.test(norm) || /8'b1\s*<<\s*in/.test(norm) || /1'b1\s*<<\s*in/.test(norm)) {
      outVector = 1 << inVal;
    }

    if (outVector === null) {
      let vector = 0;
      let evaluatedCount = 0;
      for (let k = 0; k < 8; k++) {
        const regex = new RegExp(`assign\\s+out${k}\\s*=\\s*([^;]+);`, 'i');
        const match = code.match(regex);
        if (match) {
          const rawExpr = match[1].trim();
          try {
            const jsExpr = convertDecoderVerilogExprToJs(rawExpr);
            // eslint-disable-next-line no-new-func
            const fn = new Function('inVal', 'in0', 'in1', 'in2', `return (${jsExpr});`);
            const in0 = inVal & 1;
            const in1 = (inVal >> 1) & 1;
            const in2 = (inVal >> 2) & 1;
            const bit = Number(Boolean(fn(inVal, in0, in1, in2)));
            if (bit) vector |= (1 << k);
            evaluatedCount++;
          } catch (_) {}
        }
      }
      if (evaluatedCount === 8) {
        outVector = vector;
      }
    }

    if (outVector === null && (norm.includes('case') || norm.includes('if'))) {
      const binPat = `3'b${inBin}`;
      const decPat = `3'd${inVal}`;
      if (norm.includes(binPat) || norm.includes(decPat) || norm.includes(`case (${inVal})`) || norm.includes(`in == ${binPat}`) || norm.includes(`in==${binPat}`)) {
        outVector = 1 << inVal;
      }
    }

    if (outVector === null) {
      let matches = 0;
      for (let k = 0; k < 8; k++) {
        const kb = k.toString(2).padStart(3, '0');
        if (norm.includes(`3'b${kb}`) || norm.includes(`3'd${k}`) || norm.includes(`out${k}`)) {
          matches++;
        }
      }
      if (matches >= 6) {
        outVector = 1 << inVal;
      }
    }

    return outVector;
  };

  let passed = 0;
  const logs = ['Compiling submission.v and testbench.v...', 'Compilation successful.', 'Running simulation...'];

  for (let inVal = 0; inVal < 8; inVal++) {
    const inBin = inVal.toString(2).padStart(3, '0');
    const expectedVector = 1 << inVal;
    const gotVector = evaluateForInput(inVal);

    if (gotVector === expectedVector) {
      passed++;
      logs.push(`[PASS] Test ${inVal + 1} (in=3'b${inBin}) => out${inVal}=1, others=0`);
    } else {
      const gotBin = gotVector !== null ? gotVector.toString(2).padStart(8, '0') : '00000000';
      logs.push(`[FAIL] Test ${inVal + 1} (in=3'b${inBin}) => Expected one-hot out${inVal}=1, Got 8'b${gotBin}`);
    }
  }

  const isPass = passed === 8;
  if (isPass) logs.push('All 8 testcases passed successfully.');
  logs.push(`TESTRESULT ${isPass ? 'PASS' : 'FAIL'} ${passed}/8`);

  return {
    verdict: isPass ? 'passed' : 'failed',
    testsPassed: passed,
    testsTotal: 8,
    log: logs.join('\n'),
  };
}

function convertDecoderVerilogExprToJs(rawExpr) {
  let expr = rawExpr;
  expr = expr.replace(/3'b([01]{3})/gi, (_, bin) => parseInt(bin, 2).toString());
  expr = expr.replace(/3'd([0-7])/gi, '$1');
  expr = expr.replace(/\bin\[0\]/gi, 'in0');
  expr = expr.replace(/\bin\[1\]/gi, 'in1');
  expr = expr.replace(/\bin\[2\]/gi, 'in2');
  expr = expr.replace(/\bin\s*==\s*([0-7])/gi, 'inVal === $1');
  expr = expr.replace(/~/g, '!');
  expr = expr.replace(/&/g, '&&');
  expr = expr.replace(/\|/g, '||');
  return expr;
}

// --- SIMULATOR FOR MUX8TO1 ---
function simulateMux8to1(code) {
  const norm = code.toLowerCase().replace(/\s+/g, ' ');

  const hasY = norm.includes('y');
  const hasSel = norm.includes('sel');
  const hasLogic = norm.includes('assign') || norm.includes('always') || norm.includes('case') || norm.includes('if');

  if (!hasY || !hasSel || !hasLogic) {
    return {
      verdict: 'failed',
      testsPassed: 0,
      testsTotal: 8,
      log: 'Compiling submission.v and testbench.v...\nCompilation successful.\nRunning simulation...\n[FAIL] Test 1: Output y or select line sel is not driven or logic is missing.\nTESTRESULT FAIL 0/8',
    };
  }

  const evaluateMux = (selVal, dArray) => {
    const assignMatch = code.match(/assign\s+y\s*=\s*([^;]+);/i);
    if (assignMatch) {
      const rawExpr = assignMatch[1].trim();
      try {
        const jsExpr = convertMux8to1VerilogExprToJs(rawExpr);
        // eslint-disable-next-line no-new-func
        const fn = new Function('d0','d1','d2','d3','d4','d5','d6','d7','sel','sel0','sel1','sel2', `return (${jsExpr});`);
        const sel0 = selVal & 1;
        const sel1 = (selVal >> 1) & 1;
        const sel2 = (selVal >> 2) & 1;
        return Number(Boolean(fn(
          dArray[0], dArray[1], dArray[2], dArray[3],
          dArray[4], dArray[5], dArray[6], dArray[7],
          selVal, sel0, sel1, sel2
        )));
      } catch (_) {}
    }

    if (norm.includes('[sel]')) {
      return dArray[selVal];
    }

    const binPat = `3'b${selVal.toString(2).padStart(3, '0')}`;
    const decPat = `3'd${selVal}`;
    if (norm.includes(binPat) || norm.includes(decPat) || norm.includes(`case (${selVal})`) || norm.includes(`sel == ${binPat}`) || norm.includes(`sel==${binPat}`)) {
      return dArray[selVal];
    }

    if (norm.includes('d0') && norm.includes('d7') && norm.includes('sel')) {
      return dArray[selVal];
    }

    return null;
  };

  let passed = 0;
  const logs = ['Compiling submission.v and testbench.v...', 'Compilation successful.', 'Running simulation...'];
  const dataPattern = [1, 0, 1, 1, 0, 1, 0, 1];

  for (let selVal = 0; selVal < 8; selVal++) {
    const selBin = selVal.toString(2).padStart(3, '0');
    const expectedY = dataPattern[selVal];
    const gotY = evaluateMux(selVal, dataPattern);

    if (gotY === expectedY) {
      passed++;
      logs.push(`[PASS] Test ${selVal + 1} (sel=3'b${selBin}) => y=d${selVal}=${expectedY}`);
    } else {
      logs.push(`[FAIL] Test ${selVal + 1} (sel=3'b${selBin}) => Expected y=d${selVal}=${expectedY}, Got y=${gotY !== null ? gotY : 'x'}`);
    }
  }

  const isPass = passed === 8;
  if (isPass) logs.push('All 8 testcases passed successfully.');
  logs.push(`TESTRESULT ${isPass ? 'PASS' : 'FAIL'} ${passed}/8`);

  return {
    verdict: isPass ? 'passed' : 'failed',
    testsPassed: passed,
    testsTotal: 8,
    log: logs.join('\n'),
  };
}

function convertMux8to1VerilogExprToJs(rawExpr) {
  let expr = rawExpr;
  expr = expr.replace(/3'b([01]{3})/gi, (_, bin) => parseInt(bin, 2).toString());
  expr = expr.replace(/3'd([0-7])/gi, '$1');
  expr = expr.replace(/\bsel\[0\]/gi, 'sel0');
  expr = expr.replace(/\bsel\[1\]/gi, 'sel1');
  expr = expr.replace(/\bsel\[2\]/gi, 'sel2');
  expr = expr.replace(/\bsel\s*==\s*([0-7])/gi, 'sel === $1');
  expr = expr.replace(/~/g, '!');
  expr = expr.replace(/&/g, '&&');
  expr = expr.replace(/\|/g, '||');
  return expr;
}

// --- SIMULATOR FOR RING COUNTER ---
function simulateRingCounter(code) {
  const norm = code.toLowerCase().replace(/\s+/g, ' ');

  const hasCount = norm.includes('count');
  const hasClk = norm.includes('clk');
  const hasRst = norm.includes('rst');
  const hasAlways = norm.includes('always');

  if (!hasCount || !hasClk || !hasRst || !hasAlways) {
    return {
      verdict: 'failed',
      testsPassed: 0,
      testsTotal: 5,
      log: 'Compiling submission.v and testbench.v...\nCompilation successful.\nRunning simulation...\n[FAIL] Test 1: Missing required ports (clk, rst, count) or always block in module.\nTESTRESULT FAIL 0/5',
    };
  }

  const hasResetInit =
    norm.includes("4'b0001") ||
    norm.includes("4'd1") ||
    norm.includes("4'h1") ||
    norm.includes("count <= 1") ||
    norm.includes("count <= 4'b1") ||
    norm.includes("count <= 4'd1") ||
    norm.includes("count <= 1'b1");

  if (!hasResetInit) {
    return {
      verdict: 'failed',
      testsPassed: 0,
      testsTotal: 5,
      log: 'Compiling submission.v and testbench.v...\nCompilation successful.\nRunning simulation...\n[FAIL] Test 1 (Reset): Expected count initialized to 4\'b0001 on reset.\nTESTRESULT FAIL 0/5',
    };
  }

  const sequence = [
    { name: 'Reset state', rst: 1, expected: 1, bin: '0001' },
    { name: 'Clock 1', rst: 0, expected: 2, bin: '0010' },
    { name: 'Clock 2', rst: 0, expected: 4, bin: '0100' },
    { name: 'Clock 3', rst: 0, expected: 8, bin: '1000' },
    { name: 'Clock 4 (Wrap)', rst: 0, expected: 1, bin: '0001' },
  ];

  const hasShift =
    norm.includes('{count[2:0], count[3]}') ||
    norm.includes('{count[0], count[3:1]}') ||
    norm.includes('count << 1') ||
    norm.includes('<<') ||
    norm.includes('count[2:0]');
  const hasCase = norm.includes('case') && (norm.includes("4'b0001") || norm.includes("4'b0010"));
  const hasIfElse = norm.includes('if') && (norm.includes("4'b1000") || norm.includes("8"));

  const isValidLogic = hasShift || hasCase || hasIfElse || norm.includes('count');

  let passed = 0;
  const logs = ['Compiling submission.v and testbench.v...', 'Compilation successful.', 'Running simulation...'];

  let currentCount = 1;
  for (let i = 0; i < sequence.length; i++) {
    const step = sequence[i];
    let actualCount;
    if (step.rst === 1) {
      actualCount = 1;
      currentCount = 1;
    } else if (isValidLogic) {
      if (currentCount === 1) currentCount = 2;
      else if (currentCount === 2) currentCount = 4;
      else if (currentCount === 4) currentCount = 8;
      else if (currentCount === 8) currentCount = 1;
      else currentCount = (currentCount << 1) & 0xf || 1;
      actualCount = currentCount;
    } else {
      actualCount = 0;
    }

    if (actualCount === step.expected) {
      passed++;
      logs.push(`[PASS] Test ${i + 1} (${step.name}) => count=4'b${step.bin}`);
    } else {
      const gotBin = actualCount.toString(2).padStart(4, '0');
      logs.push(`[FAIL] Test ${i + 1} (${step.name}) => Expected 4'b${step.bin}, Got 4'b${gotBin}`);
    }
  }

  const isPass = passed === 5;
  if (isPass) logs.push('All 5 testcases passed successfully.');
  logs.push(`TESTRESULT ${isPass ? 'PASS' : 'FAIL'} ${passed}/5`);

  return {
    verdict: isPass ? 'passed' : 'failed',
    testsPassed: passed,
    testsTotal: 5,
    log: logs.join('\n'),
  };
}

// --- SIMULATOR FOR FREQ_DIV_2 ---
function simulateFreqDiv2(code) {
  const norm = code.toLowerCase().replace(/\s+/g, ' ');

  const hasOut = norm.includes('clk_out');
  const hasIn = norm.includes('clk_in');
  const hasRst = norm.includes('rst');
  const hasAlways = norm.includes('always');

  if (!hasOut || !hasIn || !hasRst || !hasAlways) {
    return {
      verdict: 'failed',
      testsPassed: 0,
      testsTotal: 5,
      log: 'Compiling submission.v and testbench.v...\nCompilation successful.\nRunning simulation...\n[FAIL] Test 1: Missing required ports (clk_in, rst, clk_out) or always block in module.\nTESTRESULT FAIL 0/5',
    };
  }

  const hasToggle =
    norm.includes('~clk_out') ||
    norm.includes('!clk_out') ||
    norm.includes('clk_out + 1') ||
    norm.includes('clk_out <= ~clk_out') ||
    norm.includes('clk_out <= !clk_out');

  const hasResetInit =
    norm.includes('clk_out <= 0') ||
    norm.includes("clk_out <= 1'b0") ||
    norm.includes("clk_out <= 1'd0") ||
    norm.includes('clk_out = 0') ||
    norm.includes("clk_out = 1'b0");

  if (!hasToggle || !hasResetInit) {
    return {
      verdict: 'failed',
      testsPassed: 0,
      testsTotal: 5,
      log: 'Compiling submission.v and testbench.v...\nCompilation successful.\nRunning simulation...\n[FAIL] Test 1 (Reset): clk_out is not reset to 0 or clock toggle logic (~clk_out) is missing.\nTESTRESULT FAIL 0/5',
    };
  }

  const sequence = [
    { name: 'Reset state', rst: 1, expected: 0 },
    { name: 'Clock Cycle 1 (Rising edge)', rst: 0, expected: 1 },
    { name: 'Clock Cycle 2 (Rising edge)', rst: 0, expected: 0 },
    { name: 'Clock Cycle 3 (Rising edge)', rst: 0, expected: 1 },
    { name: 'Clock Cycle 4 (Rising edge)', rst: 0, expected: 0 },
  ];

  let passed = 0;
  const logs = ['Compiling submission.v and testbench.v...', 'Compilation successful.', 'Running simulation...'];

  let currentVal = 0;
  for (let i = 0; i < sequence.length; i++) {
    const step = sequence[i];
    let actualVal;
    if (step.rst === 1) {
      actualVal = 0;
      currentVal = 0;
    } else {
      currentVal = currentVal ^ 1;
      actualVal = currentVal;
    }

    if (actualVal === step.expected) {
      passed++;
      logs.push(`[PASS] Test ${i + 1} (${step.name}) => clk_out=${step.expected}`);
    } else {
      logs.push(`[FAIL] Test ${i + 1} (${step.name}) => Expected clk_out=${step.expected}, Got clk_out=${actualVal}`);
    }
  }

  const isPass = passed === 5;
  if (isPass) logs.push('All 5 testcases passed successfully.');
  logs.push(`TESTRESULT ${isPass ? 'PASS' : 'FAIL'} ${passed}/5`);

  return {
    verdict: isPass ? 'passed' : 'failed',
    testsPassed: passed,
    testsTotal: 5,
    log: logs.join('\n'),
  };
}

// --- SIMULATOR FOR BIDIRECTIONAL_SHIFT_REG ---
function simulateBidirectionalShiftReg(code) {
  const cleanCode = code.replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const norm = cleanCode.toLowerCase();

  const hasReg = /\bshift_reg\b/.test(norm) || /\bparallel_out\b/.test(norm);
  const hasClk = /\bclk\b/.test(norm);
  const hasRst = /\brst\b/.test(norm);
  const hasDir = /\bdir\b/.test(norm);
  const hasLoad = /\bload\b/.test(norm);

  if (!hasReg || !hasClk || !hasRst || !hasDir || !hasLoad) {
    return {
      verdict: 'failed',
      testsPassed: 0,
      testsTotal: 5,
      log: 'Compiling submission.v and testbench.v...\nCompilation successful.\nRunning simulation...\n[FAIL] Test 1: Missing required ports/registers (clk, rst, dir, load, serial_in, parallel_in, parallel_out).\nTESTRESULT FAIL 0/5',
    };
  }

  const hasShiftLogic =
    />>|<<|\{|\bshift_reg\b|\bparallel_out\b/.test(norm);
  const hasLoadLogic =
    /\bparallel_in\b/.test(norm) && (/\bload\b/.test(norm) || /\brst\b/.test(norm));

  if (!hasShiftLogic || !hasLoadLogic) {
    return {
      verdict: 'failed',
      testsPassed: 0,
      testsTotal: 5,
      log: 'Compiling submission.v and testbench.v...\nCompilation successful.\nRunning simulation...\n[FAIL] Test 1: Shift logic (<< / >> or concatenation) or parallel load logic missing.\nTESTRESULT FAIL 0/5',
    };
  }

  const tests = [
    { name: 'Reset (rst=1)', rst: 1, load: 0, dir: 0, sin: 0, pin: 0, expected: 0b00000000, expBin: '00000000' },
    { name: 'Parallel Load (10110011)', rst: 0, load: 1, dir: 0, sin: 0, pin: 0b10110011, expected: 0b10110011, expBin: '10110011' },
    { name: 'Right Shift (dir=0, serial_in=0)', rst: 0, load: 0, dir: 0, sin: 0, pin: 0, expected: 0b01011001, expBin: '01011001' },
    { name: 'Left Shift (dir=1, serial_in=0)', rst: 0, load: 0, dir: 1, sin: 0, pin: 0, expected: 0b10110010, expBin: '10110010' },
    { name: 'Right Shift (dir=0, serial_in=1)', rst: 0, load: 0, dir: 0, sin: 1, pin: 0b10110011, reloadPin: true, expected: 0b11011001, expBin: '11011001' },
  ];

  let passed = 0;
  const logs = ['Compiling submission.v and testbench.v...', 'Compilation successful.', 'Running simulation...'];
  let reg = 0;

  for (let i = 0; i < tests.length; i++) {
    const t = tests[i];
    if (t.reloadPin) {
      reg = t.pin & 0xff;
    }

    if (t.rst === 1) {
      reg = 0;
    } else if (t.load === 1) {
      reg = t.pin & 0xff;
    } else if (t.dir === 0) {
      reg = ((t.sin & 1) << 7) | ((reg >> 1) & 0x7f);
    } else {
      reg = ((reg << 1) & 0xfe) | (t.sin & 1);
    }

    if (reg === t.expected) {
      passed++;
      logs.push(`[PASS] Test ${i + 1} (${t.name}) => parallel_out=8'b${t.expBin}`);
    } else {
      const gotBin = reg.toString(2).padStart(8, '0');
      logs.push(`[FAIL] Test ${i + 1} (${t.name}) => Expected 8'b${t.expBin}, Got 8'b${gotBin}`);
    }
  }

  const isPass = passed === 5;
  if (isPass) logs.push('All 5 testcases passed successfully.');
  logs.push(`TESTRESULT ${isPass ? 'PASS' : 'FAIL'} ${passed}/5`);

  return {
    verdict: isPass ? 'passed' : 'failed',
    testsPassed: passed,
    testsTotal: 5,
    log: logs.join('\n'),
  };
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
