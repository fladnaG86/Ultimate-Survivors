#!/bin/bash
# ── Ultimate Survivor — launcher macOS ──────────────────
# Doppio click su questo file per avviare il gioco.
# Richiede Python 3 (preinstallato su macOS 10.15+).

cd "$(dirname "$0")"

PORT=8000

# Trova una porta libera se 8000 è occupata
while lsof -i TCP:$PORT &>/dev/null; do
  PORT=$((PORT + 1))
done

echo "╔════════════════════════════════════╗"
echo "║     ULTIMATE SURVIVOR — v4         ║"
echo "╚════════════════════════════════════╝"
echo ""
echo "  Server avviato su http://localhost:$PORT"
echo "  Chiudi questa finestra per fermare il gioco."
echo ""

# Apre il browser dopo 0.6s (tempo per avviare il server)
(sleep 0.6 && open "http://localhost:$PORT") &

# Avvia il server (blocca finché non si chiude la finestra)
python3 -m http.server $PORT
