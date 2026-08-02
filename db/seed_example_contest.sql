-- Example contest + 5 problems with working starter code and testbenches,
-- so the platform is runnable end-to-end out of the box.
INSERT INTO contests (id, title, description, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'HDL Sprint #1',
        '5 Verilog problems: 3 Easy + 2 Medium. Good luck!', 'draft');

-- Problem 1 (Easy): 2-to-1 multiplexer
INSERT INTO problems (contest_id, sequence_no, title, statement_md, difficulty, points, starter_code, testbench_code, top_module)
VALUES (
 '00000000-0000-0000-0000-000000000001', 1, '2-to-1 Multiplexer',
 '### Task\nImplement a 2-to-1 mux `mux2` with inputs `a, b, sel` and output `y`. `y = sel ? b : a`.',
 'easy', 100,
$$module mux2(input a, input b, input sel, output y);
  // TODO: implement
endmodule
$$,
$$module mux2_tb;
  reg a, b, sel; wire y; integer pass = 0; integer total = 4;
  mux2 dut(.a(a), .b(b), .sel(sel), .y(y));
  task check(input ea, input eb, input esel, input exp);
    begin a=ea; b=eb; sel=esel; #1;
      if (y === exp) pass = pass + 1;
    end
  endtask
  initial begin
    check(0,1,0,0); check(0,1,1,1); check(1,0,0,1); check(1,0,1,0);
    if (pass == total) $display("TESTRESULT PASS %0d/%0d", pass, total);
    else $display("TESTRESULT FAIL %0d/%0d", pass, total);
    $finish;
  end
endmodule
$$,
 'mux2'
);

-- Problem 2 (Easy): 4-bit ripple-carry adder
INSERT INTO problems (contest_id, sequence_no, title, statement_md, difficulty, points, starter_code, testbench_code, top_module)
VALUES (
 '00000000-0000-0000-0000-000000000001', 2, '4-bit Adder',
 '### Task\nImplement `adder4` with `a[3:0]`, `b[3:0]`, `cin`, outputs `sum[3:0]`, `cout`.',
 'easy', 100,
$$module adder4(input [3:0] a, input [3:0] b, input cin, output [3:0] sum, output cout);
  // TODO: implement
endmodule
$$,
$$module adder4_tb;
  reg [3:0] a, b; reg cin; wire [3:0] sum; wire cout;
  integer pass = 0; integer total = 3; reg [4:0] expected;
  adder4 dut(.a(a), .b(b), .cin(cin), .sum(sum), .cout(cout));
  task check(input [3:0] ea, input [3:0] eb, input ec);
    begin a=ea; b=eb; cin=ec; #1;
      expected = ea + eb + ec;
      if ({cout, sum} === expected) pass = pass + 1;
    end
  endtask
  initial begin
    check(4'd3, 4'd5, 0); check(4'd15, 4'd1, 0); check(4'd8, 4'd8, 1);
    if (pass == total) $display("TESTRESULT PASS %0d/%0d", pass, total);
    else $display("TESTRESULT FAIL %0d/%0d", pass, total);
    $finish;
  end
endmodule
$$,
 'adder4'
);

-- Problem 3 (Easy): D flip-flop with synchronous reset
INSERT INTO problems (contest_id, sequence_no, title, statement_md, difficulty, points, starter_code, testbench_code, top_module)
VALUES (
 '00000000-0000-0000-0000-000000000001', 3, 'D Flip-Flop (sync reset)',
 '### Task\nImplement `dff_sr` with `clk, rst, d`, output `q`. On rising clk: if rst, q<=0, else q<=d.',
 'easy', 100,
$$module dff_sr(input clk, input rst, input d, output reg q);
  // TODO: implement
endmodule
$$,
$$module dff_sr_tb;
  reg clk = 0; reg rst; reg d; wire q; integer pass = 0; integer total = 3;
  dff_sr dut(.clk(clk), .rst(rst), .d(d), .q(q));
  always #1 clk = ~clk;
  initial begin
    rst = 1; d = 1; @(posedge clk); #0.1; if (q === 0) pass = pass + 1;
    rst = 0; d = 1; @(posedge clk); #0.1; if (q === 1) pass = pass + 1;
    rst = 0; d = 0; @(posedge clk); #0.1; if (q === 0) pass = pass + 1;
    if (pass == total) $display("TESTRESULT PASS %0d/%0d", pass, total);
    else $display("TESTRESULT FAIL %0d/%0d", pass, total);
    $finish;
  end
endmodule
$$,
 'dff_sr'
);

-- Problem 4 (Medium): 8-bit up counter with enable
INSERT INTO problems (contest_id, sequence_no, title, statement_md, difficulty, points, starter_code, testbench_code, top_module)
VALUES (
 '00000000-0000-0000-0000-000000000001', 4, '8-bit Up Counter with Enable',
 '### Task\nImplement `counter8` with `clk, rst, en`, output `count[7:0]`. Sync reset to 0; counts up on clk when en=1.',
 'medium', 200,
$$module counter8(input clk, input rst, input en, output reg [7:0] count);
  // TODO: implement
endmodule
$$,
$$module counter8_tb;
  reg clk = 0; reg rst; reg en; wire [7:0] count;
  integer pass = 0; integer total = 4; integer i;
  counter8 dut(.clk(clk), .rst(rst), .en(en), .count(count));
  always #1 clk = ~clk;
  initial begin
    rst = 1; en = 0; @(posedge clk); #0.1; if (count === 0) pass = pass + 1;
    rst = 0; en = 0; @(posedge clk); #0.1; if (count === 0) pass = pass + 1;
    en = 1;
    for (i = 0; i < 3; i = i + 1) @(posedge clk);
    #0.1; if (count === 3) pass = pass + 1;
    rst = 1; @(posedge clk); #0.1; if (count === 0) pass = pass + 1;
    if (pass == total) $display("TESTRESULT PASS %0d/%0d", pass, total);
    else $display("TESTRESULT FAIL %0d/%0d", pass, total);
    $finish;
  end
endmodule
$$,
 'counter8'
);

-- Problem 5 (Medium): Simple FSM traffic light controller
INSERT INTO problems (contest_id, sequence_no, title, statement_md, difficulty, points, starter_code, testbench_code, top_module)
VALUES (
 '00000000-0000-0000-0000-000000000001', 5, 'Traffic Light FSM',
 '### Task\nImplement `traffic_fsm`: `clk, rst`, output `light[1:0]` (0=RED,1=GREEN,2=YELLOW). Cycles RED->GREEN->YELLOW->RED every clk, sync reset to RED.',
 'medium', 200,
$$module traffic_fsm(input clk, input rst, output reg [1:0] light);
  // TODO: implement. 0=RED, 1=GREEN, 2=YELLOW
endmodule
$$,
$$module traffic_fsm_tb;
  reg clk = 0; reg rst; wire [1:0] light;
  integer pass = 0; integer total = 4;
  traffic_fsm dut(.clk(clk), .rst(rst), .light(light));
  always #1 clk = ~clk;
  initial begin
    rst = 1; @(posedge clk); #0.1; if (light === 0) pass = pass + 1;
    rst = 0; @(posedge clk); #0.1; if (light === 1) pass = pass + 1;
    @(posedge clk); #0.1; if (light === 2) pass = pass + 1;
    @(posedge clk); #0.1; if (light === 0) pass = pass + 1;
    if (pass == total) $display("TESTRESULT PASS %0d/%0d", pass, total);
    else $display("TESTRESULT FAIL %0d/%0d", pass, total);
    $finish;
  end
endmodule
$$,
 'traffic_fsm'
);

-- Example admin + judge accounts (passwords must be set via the register
-- endpoint or a bcrypt hash inserted manually — placeholder hash below is
-- NOT a real bcrypt hash, replace before using).
-- INSERT INTO users (participant_id, name, password_hash, role)
-- VALUES ('admin1', 'Contest Admin', '<bcrypt-hash>', 'admin');
