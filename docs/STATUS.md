# Status

Updated 2026-11-04.

- **Auth is a VPS session, not Cloudflare.** Sign-in is an email one-time code from the Node server (app-session OTP). Cloudflare Access, Tunnel, and Cloudflare DNS are not used. Do not change the root Google MX for benjohnson.ai.
- **Allowlist:** exactly bjljohnson2012@gmail.com and alexander.varden@gmail.com. The server refuses to start if that list is widened or narrowed. Anyone else gets the same generic response and no email.
- **From address:** `ben@benjohnson.ai` only. Resend domain `benjohnson.ai` (`ede6ca6b-2a53-4ace-a11b-d3f1391535e8`) is verified (DKIM, SPF, MX, and CNAME). There is no fallback to `noreply@fieldschool.ai`. A code is discarded if Resend does not accept it. The Resend key stays in `/opt/intelligence/.env` and is not in git.
- **Gate is live.** https://intelligence.benjohnson.ai unsigned requests 302 to `/login`. `/login` is 200, title “Sign in · 2026 Market Plan”. The temporary 403 placeholder is gone. `/api/*` without a session returns 401 `{"status":"refused","unknownReason":"Sign-in required"}`. Caddy reverse-proxies the host to `127.0.0.1:8787` and does not serve the files itself.
- **Sign-in checked.** One code from ben@benjohnson.ai to bjljohnson2012@gmail.com was delivered, and that session opened the plan (title “2026 Market Plan · Ministry Brands”). alexander.varden@gmail.com is allowlisted and was not sent a code. A non-allowlisted address got the generic ok response and no Resend message.
- **Deployed commit:** pack surface on branch `cursor/pack-shell-redesign-88ad`. Start here is the pack lead. The Vite path panels are gone. Login uses the same tokens and still says only the newest code works.
- **Ask is still a stub.** `POST /api/ask` is still a stub until Product Ask. It returns the same 401 `{"status":"refused","unknownReason":"Sign-in required"}` even after sign-in.
- **Source of truth.** Build-out is tracked in this repository. https://share.benjohnson.ai remains private snapshots only.
- **Dual paths.** Mid-size weekly attendance 250–999 (Core) and Commercial Plus / Enterprise at 1,000+. Live Core / mid-size selling stays on hold. This site is planning only.
