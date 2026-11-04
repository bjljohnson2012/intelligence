import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadEnvFile } from './env.js';

test('quoted AUTH_FROM_EMAIL from the example loads as the fieldschool sender', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'intel-env-'));
  const file = path.join(dir, '.env');
  const key = 'AUTH_FROM_EMAIL';
  const previous = process.env[key];
  delete process.env[key];
  try {
    await writeFile(file, `${key}="Intelligence <noreply@fieldschool.ai>"\n`);
    loadEnvFile(file);
    assert.equal(process.env[key], 'Intelligence <noreply@fieldschool.ai>');
  } finally {
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
    await rm(dir, { recursive: true, force: true });
  }
});
