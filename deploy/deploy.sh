#!/usr/bin/env bash
# Build the plan and install the session server on the VPS.
# Caddy stays in Docker. The Node process joins Caddy's network namespace so
# reverse_proxy 127.0.0.1:8787 reaches it, and port 8787 is not published.
# This script does not upload secrets. Create /opt/intelligence/.env on the server first.
set -euo pipefail
cd "$(dirname "$0")/.."
KEY=${KEY:-/home/box/.ssh/vps_deploy_fmt}
HOST=${HOST:-root@2.24.70.248}
DEST=${DEST:-/opt/intelligence}
CADDYFILE=${CADDYFILE:-/opt/ae-coach/docker/Caddyfile}
SSH=(ssh -i "$KEY" -o IdentitiesOnly=yes)
SCP=(scp -i "$KEY" -o IdentitiesOnly=yes)

npm run build
test -f dist/index.html

TAR=$(mktemp)
tar czf "$TAR" \
  --exclude node_modules \
  --exclude .env \
  --exclude deploy/.env \
  dist server package.json package-lock.json deploy
"${SCP[@]}" "$TAR" "$HOST:/tmp/intelligence-src.tgz"
rm -f "$TAR"

"${SSH[@]}" "$HOST" "bash -s" -- "$DEST" "$CADDYFILE" << 'EOF'
set -euo pipefail
DEST=$1
CADDYFILE=$2
mkdir -p "$DEST"
tar xzf /tmp/intelligence-src.tgz -C "$DEST"
rm -f /tmp/intelligence-src.tgz
if [[ ! -f "$DEST/.env" ]]; then
  echo "Missing $DEST/.env"
  echo "Copy $DEST/deploy/.env.example to $DEST/.env, then set SESSION_SECRET, RESEND_API_KEY, and AUTH_FROM_EMAIL=ben@benjohnson.ai"
  exit 1
fi
chmod 600 "$DEST/.env"
docker run --rm -v "$DEST":/app -w /app node:22-bookworm npm ci --omit=dev
docker rm -f intelligence >/dev/null 2>&1 || true
docker run -d --name intelligence --restart unless-stopped \
  --network container:ae-coach-caddy-1 \
  --env-file "$DEST/.env" \
  -v "$DEST":/app -w /app \
  node:22-bookworm node server/index.js
python3 "$DEST/deploy/update-caddy-site.py" "$CADDYFILE" "$DEST/deploy/Caddyfile.intelligence"
docker exec ae-coach-caddy-1 caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
echo "Deployed. Sign-in is required at https://intelligence.benjohnson.ai"
EOF
