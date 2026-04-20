#!/bin/bash
# ── Ultimate Survivor — launcher terminale ──────────────

cd "$(dirname "$0")"

PORT=8000
while lsof -i TCP:$PORT &>/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

echo "╔════════════════════════════════════╗"
echo "║     ULTIMATE SURVIVOR — v4         ║"
echo "╚════════════════════════════════════╝"
echo ""
echo "  http://localhost:$PORT"
echo "  Ctrl+C per fermare."
echo ""

(sleep 0.6 && {
  if command -v open &>/dev/null; then
    open "http://localhost:$PORT"
  elif command -v xdg-open &>/dev/null; then
    xdg-open "http://localhost:$PORT"
  fi
}) &

python3 -m http.server $PORT
