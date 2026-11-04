# 2026 Market Plan

Interactive planning app for the Ministry Brands 2026 market plan. Vite builds a static site (vanilla JavaScript and Chart.js). A small Node server on the VPS serves that build and signs people in with an email code.

The app has two paths:

- **Mid-size churches (core)** — weekly attendance 250–999. This is the first path in the plan. Live selling is on hold; the app is planning only.
- **Large churches** — weekly attendance 1,000+, including Commercial Plus and Enterprise. Named accounts, formal reviews, and multi-campus needs. A separate path, not a leftover of the mid-size plan.

Product copy stays in plain language. Say **Thing to plan for** and **Thing to think about**. Do not put internal tracker names in the product.

This repository is the source of truth for the build-out. Private file snapshots belong on [share.benjohnson.ai](https://share.benjohnson.ai) only. The interactive plan lives at **https://intelligence.benjohnson.ai**.

## V3 (Next.js)

`web/` is the V3 app: Next.js 14 App Router, shadcn/ui, Recharts, and MapLibre. It is not deployed over the live Vite host. Run it locally:

```bash
cd web
npm install
npm run dev
```

Set `SESSION_SECRET` and `ALLOWLIST_EMAILS` in the environment first (same contract as the VPS server). Leave `SUPABASE_URL` empty until a Supabase project exists. The app then reads the pack JSON. Code requests still go through Resend only when `RESEND_API_KEY` is set. Do not point this branch at the live host until Designer, Flow, and Clarity each score at least 8.

## Sign-in

Auth is a session on the VPS. There is no Cloudflare Access, Tunnel, or Cloudflare DNS in front of this host. Leave the root Google MX for benjohnson.ai alone.

Only these addresses can sign in:

- bjljohnson2012@gmail.com
- alexander.varden@gmail.com

The login page asks for an email and a 6-digit code. Addresses that are not on the list get the same response and no email. The code is stored hashed, expires in 5 minutes, and a person can request another code after 60 seconds (3 requests an hour). A successful code sets an `intel_session` cookie: httpOnly, Secure, SameSite=Lax, signed with `SESSION_SECRET`, for 7 days from that verification. The signature includes the client IP seen at sign-in. The same browser on that IP is admitted, and opening the plan or `/login` does not send a new code. A different IP, a sign-out, or a session older than 7 days needs a fresh code.

People who are not signed in are redirected to `/login`. They do not receive the plan HTML, scripts, or `/data` files. API calls without a session return `401` `{"status":"refused","unknownReason":"Sign-in required"}`.

Sign-in mail is sent with Resend from **`ben@benjohnson.ai`** only. The Resend domain `benjohnson.ai` (`ede6ca6b-2a53-4ace-a11b-d3f1391535e8`) is verified (DKIM, SPF, MX, and CNAME). Do not send from `noreply@fieldschool.ai`. The code is kept only after Resend accepts the message. The key stays in the server environment. The session gate is live on https://intelligence.benjohnson.ai. Current proof is in [`docs/STATUS.md`](docs/STATUS.md).

`POST /api/ask` answers from the pack for a signed-in allowlisted session and cites the item it used. Unsigned calls return 401. If the pack does not say, the status is Explicit Unknown and the citations point at items that still need clarification.

## Local

```bash
npm install
npm test
npm run build          # Vite -> dist/
npm run start          # node server/index.js on 127.0.0.1:8787
```

`npm run dev` is only the Vite draft on your machine. It does not enforce sign-in. Do not expose it.

Copy `.env.example` (same values as `deploy/.env.example`) to `.env` in the repo root before `npm run start`. Set `SESSION_SECRET` (`openssl rand -base64 48`) and `RESEND_API_KEY`, and leave:

```bash
AUTH_FROM_EMAIL=ben@benjohnson.ai
ALLOWLIST_EMAILS=bjljohnson2012@gmail.com,alexander.varden@gmail.com
PORT=8787
HOST=127.0.0.1
```

Never commit `.env` or the Resend key.

## Deploy

Notes and the Caddy site block are in [`deploy/`](deploy/).

`deploy/deploy.sh` is the install path. It has not been run for this change. When someone does run it, it builds `dist/`, copies the app to `/opt/intelligence` on the VPS, installs production npm packages, and starts the Node process. It does not upload `.env`. On the server, once:

```bash
cp /opt/intelligence/deploy/.env.example /opt/intelligence/.env
chmod 600 /opt/intelligence/.env
# fill SESSION_SECRET and RESEND_API_KEY
# AUTH_FROM_EMAIL=ben@benjohnson.ai
```

Caddy for this host runs in Docker (`ae-coach-caddy-1`). Inside that container, `127.0.0.1` is not the VPS host. `deploy.sh` starts Node with `--network container:ae-coach-caddy-1` so Caddy's `reverse_proxy 127.0.0.1:8787` reaches it, and port 8787 is not opened on the public internet. If the Caddy container is recreated, restart `intelligence` (it shares that network namespace).

`deploy/Caddyfile.intelligence` is the site block: gzip, `X-Robots-Tag: noindex, nofollow`, the reverse proxy, and the access log. No placeholder page and no file server. `deploy.sh` replaces that block in `/opt/ae-coach/docker/Caddyfile` (it keeps a backup) and reloads Caddy:

```bash
docker exec ae-coach-caddy-1 caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
```

The SSH key stays on the deploy host (`KEY`, default `/home/box/.ssh/vps_deploy_fmt`).

### systemd, if Caddy is on the host network

Use `deploy/intelligence.service` only when Caddy itself can open `127.0.0.1:8787` on the host. That is not the current Docker setup.

```bash
cp deploy/intelligence.service /etc/systemd/system/intelligence.service
# point ExecStart at `which node` if it is not /usr/bin/node
systemctl daemon-reload
systemctl enable --now intelligence
systemctl restart intelligence
```

### Docker, run by hand

```bash
docker rm -f intelligence || true
docker run -d --name intelligence --restart unless-stopped \
  --network container:ae-coach-caddy-1 \
  --env-file /opt/intelligence/.env \
  -v /opt/intelligence:/app -w /app \
  node:22-bookworm node server/index.js
```

## Data

Each JSON file in `public/data/` has `refresh` and `source`. Figures are refreshed by hand. There are no live tickers. Screen layout is in [`IA.md`](IA.md). Current gate status is in [`docs/STATUS.md`](docs/STATUS.md).
