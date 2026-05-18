#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/.runlogs"

# Expected service ports
BACKEND_PORT="${BACKEND_PORT:-3001}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
EXTRA_BACKEND_PORT="${EXTRA_BACKEND_PORT:-3002}"

API_BASE_URL="${API_BASE_URL:-http://localhost:${BACKEND_PORT}/api}"
ENABLE_SYNC_SCHEDULER="${ENABLE_SYNC_SCHEDULER:-false}"
FOLLOW_LOGS="${FOLLOW_LOGS:-true}"

mkdir -p "$LOG_DIR"

info() {
  echo "[manage-services] $*"
}

is_listening_on_port() {
  local port="$1"
  lsof -t -i TCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
}

kill_port_listeners() {
  local port="$1"
  local pids
  pids="$(lsof -t -i TCP:"$port" -sTCP:LISTEN 2>/dev/null | sort -u || true)"
  if [[ -n "$pids" ]]; then
    info "Stopping process(es) on port $port: $pids"
    # shellcheck disable=SC2086
    kill -TERM $pids 2>/dev/null || true
    sleep 1
    # shellcheck disable=SC2086
    kill -KILL $pids 2>/dev/null || true
  fi
}

kill_matching_processes() {
  local pattern="$1"
  local pids
  pids="$(ps -eo pid=,args= | grep -E "$pattern" | grep -v grep | awk '{print $1}' | sort -u || true)"
  if [[ -n "$pids" ]]; then
    info "Stopping matching process(es): $pids"
    # shellcheck disable=SC2086
    kill -TERM $pids 2>/dev/null || true
    sleep 1
    # shellcheck disable=SC2086
    kill -KILL $pids 2>/dev/null || true
  fi
}

wait_for_port() {
  local port="$1"
  local name="$2"
  local timeout_seconds="${3:-40}"
  local waited=0

  while (( waited < timeout_seconds )); do
    if is_listening_on_port "$port"; then
      info "$name is up on port $port"
      return 0
    fi
    sleep 1
    waited=$((waited + 1))
  done

  info "Timed out waiting for $name on port $port"
  return 1
}

start_backend() {
  info "Starting backend..."
  (
    cd "$ROOT_DIR/backend"
    nohup npm run start:dev >"$LOG_DIR/backend.log" 2>&1 &
    echo $! >"$LOG_DIR/backend.pid"
  )
}

start_sync_scheduler() {
  info "Starting Gmail sync scheduler..."
  (
    cd "$ROOT_DIR/backend"
    export API_BASE_URL="$API_BASE_URL"
    nohup node scripts/sync-scheduler.js >"$LOG_DIR/sync-scheduler.log" 2>&1 &
    echo $! >"$LOG_DIR/sync-scheduler.pid"
  )
}

start_frontend() {
  info "Starting frontend..."
  (
    cd "$ROOT_DIR/frontend"
    export CHOKIDAR_USEPOLLING=true
    export WATCHPACK_POLLING=true
    unset WDS_ALLOWED_HOSTS
    export HOST="localhost"
    export DANGEROUSLY_DISABLE_HOST_CHECK=true
    nohup npm start >"$LOG_DIR/frontend.log" 2>&1 &
    echo $! >"$LOG_DIR/frontend.pid"
  )
}

stop_all() {
  info "Stopping frontend and backend..."

  # Kill by known ports first.
  kill_port_listeners "$FRONTEND_PORT"
  kill_port_listeners "$BACKEND_PORT"
  kill_port_listeners "$EXTRA_BACKEND_PORT"

  # Clean up stragglers by command pattern.
  kill_matching_processes 'Quotebot/backend.*(nest start|npm run start:dev)'
  kill_matching_processes 'sync-scheduler'
  kill_matching_processes 'Quotebot/frontend.*(react-scripts start|npm start)'
}

open_frontend() {
  local url="http://localhost:${FRONTEND_PORT}"
  info "Opening frontend: $url"
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
  elif command -v gio >/dev/null 2>&1; then
    gio open "$url" >/dev/null 2>&1 || true
  else
    info "xdg-open not available; open $url in your browser"
  fi
}

start_all() {
  start_backend
  wait_for_port "$BACKEND_PORT" "backend" 50 || true

  start_frontend
  if [[ "$ENABLE_SYNC_SCHEDULER" == "true" ]]; then
    sleep 2 && start_sync_scheduler
  else
    info "Skipping Gmail sync scheduler (ENABLE_SYNC_SCHEDULER=false)"
  fi
  wait_for_port "$FRONTEND_PORT" "frontend" 70 || true
  open_frontend

  if [[ "$FOLLOW_LOGS" == "true" ]]; then
    info "Streaming logs (CTRL+C to stop tailing)..."
    local sync_log="$LOG_DIR/sync-scheduler.log"
    if [[ -f "$sync_log" ]]; then
      tail -n 200 -F "$LOG_DIR/backend.log" "$LOG_DIR/frontend.log" "$sync_log"
    else
      tail -n 200 -F "$LOG_DIR/backend.log" "$LOG_DIR/frontend.log"
    fi
  fi
}

status_all() {
  info "Service listeners:"
  lsof -i TCP:"$FRONTEND_PORT" -i TCP:"$BACKEND_PORT" -i TCP:"$EXTRA_BACKEND_PORT" 2>/dev/null | grep LISTEN || info "No listeners found on tracked ports"
  info "Logs: $LOG_DIR"
}

usage() {
  cat <<EOF
Usage: $(basename "$0") <start|stop|restart|status>

Commands:
  start    Start backend and frontend
  stop     Stop backend and frontend
  restart  Stop then start all services
  status   Show active listeners for tracked ports

Environment overrides:
  BACKEND_PORT, FRONTEND_PORT, EXTRA_BACKEND_PORT
  API_BASE_URL
  ENABLE_SYNC_SCHEDULER=false (optional)
  FOLLOW_LOGS=true (stream logs after start)
EOF
}

main() {
  local cmd="${1:-restart}"

  case "$cmd" in
    start)
      start_all
      ;;
    stop)
      stop_all
      ;;
    restart)
      stop_all
      start_all
      ;;
    status)
      status_all
      ;;
    *)
      usage
      exit 1
      ;;
  esac

  info "Done."
}

main "$@"
