import test from 'node:test';
import assert from 'node:assert/strict';
import { bareAddress, formatFrom, sendSignInCode, signInContent } from './mail.js';

test('sign-in mail keeps the interim fieldschool sender and a readable code', () => {
  const from = 'Intelligence <noreply@fieldschool.ai>';
  assert.equal(formatFrom(from), from);
  assert.equal(bareAddress(from), 'noreply@fieldschool.ai');
  assert.equal(formatFrom('ben@benjohnson.ai'), '2026 Market Plan <ben@benjohnson.ai>');
  const content = signInContent('123456');
  assert.match(content.html, /font-size:32px/);
  assert.match(content.html, /123456/);
  assert.match(content.text, /expires in 10 minutes/);
  assert.match(content.text, /did not ask for this/);
});

test('retries transient Resend errors with the same idempotency key', async () => {
  const calls = [];
  const client = {
    emails: {
      send: async (payload, opts) => {
        calls.push({ payload, opts });
        if (calls.length < 3) return { data: null, error: { message: 'unavailable', statusCode: 500 } };
        return { data: { id: 'email_1' }, error: null };
      },
    },
  };
  const result = await sendSignInCode({
    apiKey: 're_test',
    from: 'Intelligence <noreply@fieldschool.ai>',
    to: 'bjljohnson2012@gmail.com',
    code: '654321',
    idempotencyKey: 'sign-in-code/abc',
    client,
    sleep: async () => {},
  });
  assert.deepEqual(result, { ok: true, id: 'email_1' });
  assert.equal(calls.length, 3);
  assert.equal(calls[0].opts.idempotencyKey, 'sign-in-code/abc');
  assert.equal(calls[2].opts.idempotencyKey, 'sign-in-code/abc');
  assert.equal(calls[0].payload.from, 'Intelligence <noreply@fieldschool.ai>');
  assert.equal(calls[0].payload.replyTo, 'noreply@fieldschool.ai');
  assert.deepEqual(calls[0].payload.to, ['bjljohnson2012@gmail.com']);
});

test('does not retry a rejected Resend request', async () => {
  let calls = 0;
  const client = {
    emails: {
      send: async () => {
        calls += 1;
        return { data: null, error: { message: 'bad from', statusCode: 403 } };
      },
    },
  };
  const result = await sendSignInCode({
    apiKey: 're_test',
    from: 'Intelligence <noreply@fieldschool.ai>',
    to: 'bjljohnson2012@gmail.com',
    code: '654321',
    idempotencyKey: 'sign-in-code/once',
    client,
    sleep: async () => {},
  });
  assert.deepEqual(result, { ok: false });
  assert.equal(calls, 1);
});
