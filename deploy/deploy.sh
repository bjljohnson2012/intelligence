#!/usr/bin/env bash
# Build and push static dist to the VPS. Caddy (container ae-coach-caddy-1) serves /data/sites/intelligence,
# which is host path /var/lib/docker/volumes/ae-coach_caddy_data/_data/sites/intelligence.
set -euo pipefail
cd "$(dirname "$0")/.."
KEY=${KEY:-/home/box/.ssh/vps_deploy_fmt}; HOST=root@2.24.70.248
DEST=/var/lib/docker/volumes/ae-coach_caddy_data/_data/sites/intelligence
npm run build
ssh -i "$KEY" -o IdentitiesOnly=yes $HOST "mkdir -p $DEST.new && rm -rf $DEST.new/*"
scp -i "$KEY" -o IdentitiesOnly=yes -r dist/* $HOST:$DEST.new/
ssh -i "$KEY" -o IdentitiesOnly=yes $HOST "rm -rf $DEST.old; [ -d $DEST ] && mv $DEST $DEST.old; mv $DEST.new $DEST"
echo "Deployed. https://intelligence.benjohnson.ai"
