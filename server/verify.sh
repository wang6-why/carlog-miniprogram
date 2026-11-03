#!/usr/bin/env bash
# 本地接口自检脚本：打包 -> 启动 -> 逐个打接口 -> 关服务
set -u
MVN_BIN="/d/develop/apache-maven-3.9.4/bin/mvn"
PORT="${PORT:-8089}"
BASE="http://127.0.0.1:${PORT}/api"
LOG="/tmp/carlog-verify.log"

kill_port() {
  local pid
  pid=$(netstat -ano | grep ":${PORT}" | grep LISTENING | head -1 | awk '{print $5}')
  if [ -n "${pid:-}" ]; then taskkill //F //PID "$pid" >/dev/null 2>&1; sleep 2; fi
}

echo "[1/4] 打包..."
# 必须先杀掉占用 jar 的旧进程，否则 Windows 下 repackage 无法重命名 jar
kill_port
"$MVN_BIN" -B -q -DskipTests package 2>&1 | tail -8
if [ ! -f target/carlog-server.jar ]; then echo "打包失败"; exit 1; fi

echo "[2/4] 启动..."
nohup java -jar target/carlog-server.jar --server.port="${PORT}" > "$LOG" 2>&1 &
for i in $(seq 1 40); do
  sleep 1
  if grep -q "Started CarlogApplication" "$LOG" 2>/dev/null; then echo "  启动成功(${i}s)"; break; fi
  if [ "$i" -eq 40 ]; then echo "  启动超时"; tail -30 "$LOG"; exit 1; fi
done

echo "[3/4] 接口验证..."
TOKEN=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"123456"}' \
  | python -c "import sys,json;d=json.load(sys.stdin);print(d.get('data',{}).get('token',''))" 2>/dev/null)
if [ -z "$TOKEN" ]; then echo "  登录失败"; exit 1; fi
echo "  登录 OK  token=${TOKEN:0:24}..."

hit() {
  local method="$1" path="$2" body="${3:-}"
  local out
  if [ -n "$body" ]; then
    out=$(curl -s -X "$method" "$BASE$path" -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" -d "$body")
  else
    out=$(curl -s -X "$method" "$BASE$path" -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json")
  fi
  local code
  code=$(printf '%s' "$out" | python -c "import sys,json
try:
    d=json.load(sys.stdin); print(d.get('code'))
except Exception:
    print('PARSE_ERR')" 2>/dev/null)
  if [ "$code" = "0" ]; then
    echo "  OK   $method $path"
  else
    echo "  FAIL $method $path  -> $code"
    printf '%s\n' "$out" | head -c 600
    echo
  fi
}

hit GET  "/auth/me"
hit GET  "/cars"
CAR_ID=$(curl -s "$BASE/cars" -H "Authorization: Bearer $TOKEN" \
  | python -c "import sys,json;d=json.load(sys.stdin);print(d['data'][0]['id'] if d.get('data') else '')" 2>/dev/null)
echo "  当前车辆 id=$CAR_ID"
hit GET  "/cars/$CAR_ID"
hit GET  "/fuel-logs?carId=$CAR_ID"
hit GET  "/maintenance/templates"
hit GET  "/maintenance/logs?carId=$CAR_ID"
hit GET  "/dashboard/overview/$CAR_ID"
hit GET  "/dashboard/monthly/$CAR_ID"

echo "[4/4] 关闭服务..."
kill_port
echo "完成，日志：$LOG"
