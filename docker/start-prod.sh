#!/bin/sh
set -e

cd /srv/api
node dist/index.js &
API_PID=$!

cleanup() {
  kill "$API_PID" 2>/dev/null || true
}
trap cleanup TERM INT

# Aguarda a API subir antes do Nginx aceitar tráfego
i=0
while [ "$i" -lt 60 ]; do
  if wget -qO- http://127.0.0.1:4000/api/health 2>/dev/null | grep -q '"status":"ok"'; then
    break
  fi
  i=$((i + 1))
  sleep 1
done

exec nginx -g 'daemon off;'
