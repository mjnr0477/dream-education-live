#!/usr/bin/env bash
# Interactive launcher for an authorized Dream Wi-Fi source endpoint.
# Credentials are read without echo and are not written to disk.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. On Termux run: pkg install nodejs"
  exit 1
fi
if [ ! -f "$ROOT/scripts/dream-wifi-source-agent.js" ]; then
  echo "Run this script from a Dream Education repository checkout."
  exit 1
fi
if ! node -e "require('ws')" >/dev/null 2>&1; then
  echo "The Node.js 'ws' dependency is missing. Install the project dependencies first with: npm install"
  exit 1
fi

DEFAULT_URL="wss://dream-education-live-4.onrender.com/api/dream-education/dream-wifi/tunnel"
read -r -p "Dream Wi-Fi tunnel URL [$DEFAULT_URL]: " input_url
export DREAM_WIFI_TUNNEL_URL="${input_url:-$DEFAULT_URL}"
if [[ ! "$DREAM_WIFI_TUNNEL_URL" =~ ^wss:// ]]; then
  echo "Refusing an insecure tunnel URL. Use wss://."
  exit 1
fi

printf "Source token (input hidden): "
IFS= read -r -s DREAM_WIFI_SOURCE_TOKEN
printf "\n"
if [ -z "$DREAM_WIFI_SOURCE_TOKEN" ]; then
  echo "A source token is required. Configure it on the hosted service; do not paste it into public chats."
  exit 1
fi
export DREAM_WIFI_SOURCE_TOKEN

DEFAULT_ID="$(hostname 2>/dev/null | tr -cs '[:alnum:]_-' '-' | cut -c1-60)"
DEFAULT_ID="${DEFAULT_ID:-dream-source}"
read -r -p "Unique source ID [$DEFAULT_ID]: " input_id
DREAM_WIFI_SOURCE_ID="${input_id:-$DEFAULT_ID}"
DREAM_WIFI_SOURCE_ID="$(printf '%s' "$DREAM_WIFI_SOURCE_ID" | tr -cs '[:alnum:]_-' '-')"
if [[ ! "$DREAM_WIFI_SOURCE_ID" =~ ^[a-zA-Z0-9_-]{1,80}$ ]]; then
  echo "Invalid source ID. Use letters, numbers, underscore, or hyphen (max 80 characters)."
  exit 1
fi
export DREAM_WIFI_SOURCE_ID

read -r -p "Friendly Wi-Fi/source name (leave blank to auto-detect): " DREAM_WIFI_SOURCE_NAME
export DREAM_WIFI_SOURCE_NAME

echo
echo "Starting the authorized source relay."
echo "Keep this process running and keep this device connected to the intended network."
echo "Press Ctrl+C to stop. The token is only held in this process environment; it is not saved by this script."
exec node "$ROOT/scripts/dream-wifi-source-agent.js"
