#!/bin/sh
# Compiles submission.v + testbench.v with Icarus Verilog and runs it.
# Usage: run_testbench.sh <submission_file> <testbench_file> <top_module>
set -eu

SUBMISSION="$1"
TESTBENCH="$2"
TOP_MODULE="$3"
OUT_VVP="sim.vvp"

echo "== Compiling with iverilog =="
if ! iverilog -g2012 -o "$OUT_VVP" -s "$TOP_MODULE"_tb "$TESTBENCH" "$SUBMISSION" 2>compile_err.log; then
  # Some testbenches don't follow the *_tb naming convention; retry letting
  # iverilog auto-detect the top from the testbench file alone.
  if ! iverilog -g2012 -o "$OUT_VVP" "$TESTBENCH" "$SUBMISSION" 2>>compile_err.log; then
    echo "iverilog: compilation failed"
    cat compile_err.log
    exit 1
  fi
fi

echo "== Running simulation =="
# The testbench itself is responsible for printing:
#   TESTRESULT PASS <n>/<m>   or   TESTRESULT FAIL <n>/<m>
# and calling $finish. We just relay vvp's stdout.
vvp "$OUT_VVP"
