#!/bin/bash
# FinFolio launcher — toggle between local (with Ollama) and cloud (fly.io) modes.
#
# First double-click  → starts local server + Ollama, opens http://localhost:8080
# Second double-click → stops local server, opens https://finfolio.fly.dev
#
# The local server is required when using the Ollama provider in the AI chat,
# because browsers block HTTPS → http://localhost:* mixed-content fetches.

cd "$(dirname "$0")"

# Finder-launched scripts get a minimal PATH. Pull in the common tool locations.
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.npm-global/bin:$HOME/.fly/bin:$PATH"
[ -f "$HOME/.zprofile" ] && . "$HOME/.zprofile" 2>/dev/null
[ -f "$HOME/.zshrc"    ] && . "$HOME/.zshrc"    2>/dev/null

PORT=8080
CLOUD_URL="https://finfolio.fly.dev"
LOCAL_URL="http://localhost:${PORT}"

# ── If the local server is already running, this click means "switch to cloud" ──
if lsof -ti tcp:${PORT} >/dev/null 2>&1; then
  echo "🏠 Local running — switching to ☁️  cloud mode"
  lsof -ti tcp:${PORT} | xargs kill 2>/dev/null || true
  sleep 1
  open "${CLOUD_URL}"
  echo "✓ Opened ${CLOUD_URL}"
  sleep 2
  exit 0
fi

# ── Otherwise, start the local stack ──
echo "☁️  Currently on cloud — switching to 🏠 local mode"

# Ensure browser CORS works against local Ollama
launchctl setenv OLLAMA_ORIGINS "*" 2>/dev/null || true

# Start Ollama if not running (optional — only needed for the Ollama provider)
if ! pgrep -x ollama >/dev/null 2>&1; then
  if command -v ollama >/dev/null 2>&1; then
    echo "Starting Ollama…"
    nohup ollama serve >/tmp/ollama.log 2>&1 &
    disown
    sleep 2
  else
    echo "ℹ Ollama not installed — AI chat will still work with cloud providers only."
    echo "  Install: https://ollama.com  then:  ollama pull qwen2.5:3b"
  fi
fi

# Start the local Node server
if ! command -v node >/dev/null 2>&1; then
  echo "✗ node not found in PATH. Install Node.js (https://nodejs.org) and re-run."
  sleep 5
  exit 1
fi

echo "Starting node server.js on port ${PORT}…"
nohup node server.js >/tmp/finfolio-local.log 2>&1 &
disown

# Wait up to 10 s for the port to start listening
for i in 1 2 3 4 5 6 7 8 9 10; do
  if lsof -ti tcp:${PORT} >/dev/null 2>&1; then break; fi
  sleep 1
done

open "${LOCAL_URL}"
echo "✓ Opened ${LOCAL_URL}"
echo "  Log: tail -f /tmp/finfolio-local.log"
sleep 2
