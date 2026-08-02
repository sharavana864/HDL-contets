# 🚀 HDL CONTEST — SETUP (5 Minutes)

## Prerequisites
- Linux with Docker + Docker Compose installed
- 5 GB free disk space

## Start Here

### 1️⃣ Extract
```bash
cd ~/Downloads
unzip hdl-contest-platform.zip
cd hdl-contest-platform
```

### 2️⃣ Build Compiler
```bash
cd backend/compiler-docker
docker build -t hdl-contest-iverilog:latest .
cd ../..
```

### 3️⃣ Start Everything
```bash
docker compose up --build
```

**Wait for these lines to appear:**
```
✔ Backend started on port 4000
✔ Frontend started on port 5173
```

Then wait 10 seconds.

### 4️⃣ Open Browser
Visit: **http://localhost:5173**

### 5️⃣ Create Test Users
Open a **second terminal**:
```bash
cd ~/Downloads/hdl-contest-platform
docker compose exec backend node scripts/seedUsers.js
```

### 6️⃣ Log In
Use any of:
- ID: `iei100` | Password: `Iei100Pass!`
- ID: `iei101` | Password: `Iei101Pass!`
- ... up to `iei120`

### 7️⃣ Make Yourself Admin
Second terminal:
```bash
docker exec -it $(docker compose ps -q postgres) \
  psql -U hdl -d hdl_contest \
  -c "UPDATE users SET role = 'admin' WHERE participant_id = 'iei100';"
```

(Change `iei100` to your ID)

### 8️⃣ Log Out & Back In
Click "Log out" → log back in with same credentials

### 9️⃣ Start Contest
Click **Admin Panel** button → click **Start Contest**

### 🔟 Solve a Problem
Click **Resume Challenge** → choose **Slow (5 min)** → implement the mux:

```verilog
module mux2(input a, input b, input sel, output y);
  assign y = sel ? b : a;
endmodule
```

Click **Submit** → you should see: ✅ **PASS (4/4 tests) +100 pts**

---

## That's It!

You should now:
- ✅ See the problem statement (statement page loads)
- ✅ See the editor after choosing time mode (no SQL errors)
- ✅ Be able to submit code
- ✅ See test results

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Can't reach API" | Wait 15 sec, refresh browser |
| "Admin button missing" | Log out, log back in |
| "Time mode doesn't load" | Check `docker compose logs backend` |
| "Stuck on loading" | `docker compose restart backend` |

All done! 🎉

