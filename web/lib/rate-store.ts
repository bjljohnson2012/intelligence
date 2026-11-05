import path from 'node:path';
import { createFileStore } from '@shared/auth-flow.mjs';

type Store = ReturnType<typeof createFileStore>;

const g = globalThis as typeof globalThis & { __intelRateStore?: Store };

export function rateStore() {
  if (!g.__intelRateStore) {
    g.__intelRateStore = createFileStore(path.join(process.cwd(), '.data', 'rates.json'));
  }
  return g.__intelRateStore;
}
