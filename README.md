# 2026 Market Plan

Interactive planning app for the Ministry Brands 2026 market plan. It is a static Vite site (vanilla JavaScript and Chart.js). Chart and plan data live in `public/data/*.json` and are served at `/data/`.

The app has two paths:

- **Mid-size churches (core)** — weekly attendance 250–999. This is where selling starts.
- **Large churches** — weekly attendance 1,000+, including Commercial Plus and Enterprise. Named accounts, formal reviews, and multi-campus needs. Not a leftover of the mid-size plan.

Product copy stays in plain language. Say **Thing to plan for** and **Thing to think about**. Do not put internal tracker names or other jargon in the product.

This repository is the source of truth for the build-out. Private file snapshots belong on [share.benjohnson.ai](https://share.benjohnson.ai) only. The interactive plan lives on the VPS subdomain below.

## Local

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # writes dist/
npm run preview  # serve the production build
```

## Live site and access

**https://intelligence.benjohnson.ai**

The host is a VPS behind Caddy. Until Cloudflare Access is in front of it, the live site returns a private **403** page and `/api/*` returns **401**. Do not treat the URL as public.

When Access is configured, the email allowlist is:

- bjljohnson2012@gmail.com
- alexander.varden@gmail.com

Access is not on yet. Partial DNS on Cloudflare is blocked: the Free plan needs the zone’s full DNS, or an alternate Access setup. See `docs/STATUS.md`.

## Deploy

Deploy notes and the gated Caddy site block are in [`deploy/`](deploy/).

- `deploy/deploy.sh` — `npm run build`, then copy `dist/` to the Caddy site directory on the VPS. The SSH key stays on the deploy host (`KEY`, default `/home/box/.ssh/vps_deploy_fmt`). Do not commit that key or any `.env` values.
- `deploy/Caddyfile.intelligence` — site block for `intelligence.benjohnson.ai`. It serves the 403 placeholder and the `/api/*` 401 stub. Caddy runs in Docker (`ae-coach-caddy-1`); built files land at host `/var/lib/docker/volumes/ae-coach_caddy_data/_data/sites/intelligence` (container `/data/sites/intelligence`).

After the allowlist is actually enforcing sign-in, replace the final `handle` in that block with the static file server (`root`, `try_files`, `file_server`) and reload Caddy. Once Cloudflare proxies the host, use a DNS challenge or an origin certificate, and restrict origin 443 to Cloudflare so the gate cannot be bypassed.

## Ask the plan

The page posts `{ question, pathHint, sessionId }` to `POST /api/ask`. Today that route is a stub and returns **401** until Product AI and auth exist. The panel then says answers are switched off and links the closest plan sections. The model key, if added later, stays in server environment only — never in this repo.

## Data

Each JSON file has `refresh` and `source`. Figures are refreshed by hand from the research files. There are no live tickers.

Layout of the screens is in [`IA.md`](IA.md).
