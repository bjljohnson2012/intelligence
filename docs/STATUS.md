# Status

Updated 2026-11-04.

- **Scaffold is live and gated.** https://intelligence.benjohnson.ai is on the VPS behind Caddy and currently returns a temporary **403** until Cloudflare Access is in front of the host.
- **Access is pending.** Partial DNS is blocked: Cloudflare Access on the Free plan needs the zone’s full DNS, or an alternate setup. Intended allowlist when Access is configured: bjljohnson2012@gmail.com and alexander.varden@gmail.com.
- **Ask is a stub.** `POST /api/ask` returns **401** until Product AI and auth are in place. The panel falls back to linking plan sections.
- **Source of truth.** Build-out is tracked in this repository. https://share.benjohnson.ai is for private snapshots only; the interactive plan stays on the VPS subdomain.
- **Dual paths in the product.** Mid-size weekly attendance 250–999 (core), and large / Commercial Plus / Enterprise at 1,000+.
