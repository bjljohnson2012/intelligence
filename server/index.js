import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { loadEnvFile } from './env.js';
import { bareAddress, FROM_EMAIL, sendSignInCode } from './mail.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadEnvFile(process.env.ENV_FILE || path.join(root, '.env'));
loadEnvFile(path.join(root, 'deploy', '.env'));

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  console.error('SESSION_SECRET must be set and at least 32 characters');
  process.exit(1);
}
if (!process.env.RESEND_API_KEY) {
  console.error('RESEND_API_KEY is required');
  process.exit(1);
}
if (bareAddress(process.env.AUTH_FROM_EMAIL).toLowerCase() !== FROM_EMAIL) {
  console.error('AUTH_FROM_EMAIL must be ben@benjohnson.ai');
  process.exit(1);
}

const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || '127.0.0.1';
const app = createApp({
  env: process.env,
  distDir: path.join(root, 'dist'),
  sendEmail: ({ to, code, idempotencyKey }) => sendSignInCode({
    apiKey: process.env.RESEND_API_KEY,
    from: FROM_EMAIL,
    to,
    code,
    idempotencyKey,
  }),
});

app.listen(port, host, () => {
  console.log(`2026 Market Plan listening on http://${host}:${port}`);
});
