# Status

Updated 2026-11-04.

- **Auth is a VPS session, not Cloudflare.** Sign-in is an email code from the Node server. Cloudflare Access, Tunnel, and Cloudflare DNS are not used. Do not change the root Google MX for benjohnson.ai.
- **Allowlist:** bjljohnson2012@gmail.com and alexander.varden@gmail.com. The server refuses to start if that list is widened or narrowed. Anyone else gets the same generic response and no email.
- **From address:** `AUTH_FROM_EMAIL=ben@benjohnson.ai` only. Resend domain `benjohnson.ai` (`ede6ca6b-2a53-4ace-a11b-d3f1391535e8`) is verified (DKIM, SPF, MX, and CNAME). There is no fallback to `noreply@fieldschool.ai`. A code is discarded if Resend does not accept it. The Resend key stays in `/opt/intelligence/.env` and is not in git.
- **Gate:** unsigned requests for the plan redirect to `/login`. `/api/*` without a session returns 401 `{"status":"refused","unknownReason":"Sign-in required"}`. Caddy reverse-proxies the host to `127.0.0.1:8787` and does not serve the files itself.
- **Live host is not open.** https://intelligence.benjohnson.ai still needs the env file, the Node process, and a Caddy reload. This change does not deploy and does not prove sign-in on the VPS. Until `deploy/deploy.sh` has been run with that env, the old private 403 may still be what the host returns. After deploy, the plan HTML is only for a signed-in session.
- **Ask is still a stub.** `POST /api/ask` returns that same 401 even after sign-in, until plan answers are connected.
- **Source of truth.** Build-out is tracked in this repository. https://share.benjohnson.ai is for private snapshots only.
- **Dual paths.** Mid-size weekly attendance 250–999 (core) and large / Commercial Plus / Enterprise at 1,000+. Live mid-size selling is on hold. This site is planning only.
