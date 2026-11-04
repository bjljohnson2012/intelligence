import { Resend } from 'resend';

const RETRYABLE = new Set([429, 500, 502, 503, 504]);

export const FROM_EMAIL = 'ben@benjohnson.ai';

export function bareAddress(from) {
  const raw = String(from || '').trim();
  const wrapped = raw.match(/<([^>]+)>/);
  return (wrapped ? wrapped[1] : raw).trim();
}

/** Canonical From header. Any other mailbox, including a lookalike, is refused. */
export function formatFrom(addr) {
  if (bareAddress(addr).toLowerCase() !== FROM_EMAIL) return '';
  return `2026 Market Plan <${FROM_EMAIL}>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

export function signInContent(code) {
  const safe = escapeHtml(code);
  const text = [
    `Your sign-in code for the 2026 Market Plan is ${code}.`,
    'It expires in 10 minutes.',
    'If you did not ask for this, you can ignore this email or reply to it.',
  ].join('\n');
  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;background:#0B2545;font-family:system-ui,sans-serif">
  <div style="max-width:480px;margin:0 auto;padding:32px 20px;color:#ffffff">
    <h1 style="font-size:22px;line-height:1.3;margin:0 0 12px">Your sign-in code</h1>
    <p style="font-size:16px;line-height:1.5;color:#B2E1F6">Use this code to open the 2026 Market Plan. It expires in 10 minutes.</p>
    <p style="font-size:32px;line-height:1.2;font-family:ui-monospace,monospace;letter-spacing:0.18em;text-align:center;background:#12315c;border-radius:12px;padding:18px 8px;margin:20px 0;color:#ffffff;user-select:all">${safe}</p>
    <p style="font-size:16px;line-height:1.5;color:#B2E1F6">If you did not ask for this, you can ignore this email or reply to it.</p>
  </div>
</body>
</html>`;
  return { subject: 'Your sign-in code', text, html };
}

function statusOf(error) {
  const n = Number(error?.statusCode ?? error?.status);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Send one sign-in code. Retries only transient Resend failures and reuses the same idempotency key.
 * Returns { ok:false } on failure. Never throws for an API error.
 */
export async function sendSignInCode({ apiKey, from, to, code, idempotencyKey, client, sleep }) {
  const pause = sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const fromHeader = formatFrom(from);
  if (!apiKey || !fromHeader) {
    console.error('sign-in email not sent: RESEND_API_KEY missing or AUTH_FROM_EMAIL is not ben@benjohnson.ai');
    return { ok: false };
  }
  const resend = client || new Resend(apiKey);
  const content = signInContent(code);
  const payload = {
    from: fromHeader,
    to: [to],
    replyTo: FROM_EMAIL,
    subject: content.subject,
    html: content.html,
    text: content.text,
  };
  let lastMessage = 'unknown error';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data, error } = await resend.emails.send(payload, { idempotencyKey });
      if (!error) return { ok: true, id: data?.id };
      lastMessage = error.message || 'send failed';
      if (!RETRYABLE.has(statusOf(error))) break;
    } catch (err) {
      lastMessage = err?.message || 'send failed';
    }
    if (attempt < 2) await pause(200 * (attempt + 1));
  }
  console.error(`sign-in email failed: ${lastMessage}`);
  return { ok: false };
}
