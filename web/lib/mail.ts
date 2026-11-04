import { sendSignInCode } from '@server/mail.js';

export async function sendSignInEmail(message: { to: string; code: string; idempotencyKey: string }) {
  return sendSignInCode({
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.AUTH_FROM_EMAIL,
    to: message.to,
    code: message.code,
    idempotencyKey: message.idempotencyKey,
  });
}
