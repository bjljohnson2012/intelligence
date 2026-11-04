#!/usr/bin/env bash
# Build the Next.js app and install it on the VPS.
# Caddy stays in Docker. Next joins Caddy's network namespace so
# reverse_proxy 127.0.0.1:8787 reaches `next start`, and port 8787 is not published.
# This script does not upload secrets. Create /opt/intelligence/.env on the server first.
# Do not run this against the live host until the V3 hold is lifted.
set -euo pipefail
cd "$(dirname "$0")/.."
KEY=${KEY:-/home/box/.ssh/vps_deploy_fmt}
HOST=${HOST:-root@2.24.70.248}
DEST=${DEST:-/opt/intelligence}
CADDYFILE=${CADDYFILE:-/opt/ae-coach/docker/Caddyfile}
SSH=(ssh -i "$KEY" -o IdentitiesOnly=yes)
SCP=(scp -i "$KEY" -o IdentitiesOnly=yes)

(
  cd web
  npm ci
  npm run build
)
test -f web/.next/BUILD_ID
test -d web/public
test -d shared
test -f public/data/pack.json
test -f public/social/buyers-see-say.json
test -f public/evidence/comp-2026-11-04/mb_home.png

TAR=$(mktemp)
tar czf "$TAR" \
  --exclude web/node_modules \
  --exclude web/.next/cache \
  --exclude web/.data \
  --exclude .env \
  --exclude deploy/.env \
  web/.next \
  web/public \
  web/package.json \
  web/package-lock.json \
  web/next.config.mjs \
  shared \
  public/data \
  public/social \
  public/evidence \
  deploy
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
  echo "Copy $DEST/deploy/.env.example to $DEST/.env, then set SESSION_SECRET and RESEND_API_KEY. AUTH_FROM_EMAIL must stay ben@benjohnson.ai."
  exit 1
fi
chmod 600 "$DEST/.env"
docker run --rm -v "$DEST/web":/app -w /app node:22-bookworm npm ci --omit=dev
docker rm -f intelligence >/dev/null 2>&1 || true
docker run -d --name intelligence --restart unless-stopped \
  --network container:ae-coach-caddy-1 \
  --env-file "$DEST/.env" \
  -v "$DEST":/app -w /app/web \
  node:22-bookworm npx next start -H 127.0.0.1 -p 8787
python3 "$DEST/deploy/update-caddy-site.py" "$CADDYFILE" "$DEST/deploy/Caddyfile.intelligence"
docker exec ae-coach-caddy-1 caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
echo "Deployed. Sign-in is required at https://intelligence.benjohnson.ai"
EOF
