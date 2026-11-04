declare module '../shared/ip.mjs' {
  export function canonicalIp(value: string): string;
}

declare module '@shared/intel-session.mjs' {
  export const LIMITS: {
    codeTtlMs: number;
    sessionTtlSec: number;
    cooldownMs: number;
    requestPerEmail: number;
    requestPerIp: number;
    requestWindowMs: number;
    verifyPerEmail: number;
    verifyPerIp: number;
    verifyWindowMs: number;
    askPerEmail: number;
    askWindowMs: number;
    maxAttempts: number;
  };
  export const ASK_MIN_SCORE: number;
  export const ADMIN_EMAIL: string;
  export function canonicalIp(value: string): string;
  export function cookieHeader(value: string, maxAge: number): string;
  export function exactAllowlist(value: string | undefined): Set<string>;
  export function isCouncilAdmin(email: string): boolean;
  export function readSessionToken(input: {
    cookieHeader: string;
    secret: string;
    allowlist: Set<string>;
    nowMs: number;
    ip: string;
  }): { email: string } | null;
  export function signSession(email: string, exp: number, ip: string, secret: string): string;
}

declare module '@shared/auth-flow.mjs' {
  export function createFileStore(file: string): RateStore;
  export function requestCode(store: RateStore, input: {
    email: unknown;
    ip: string;
    now: () => number;
    allowlist: Set<string>;
    sendEmail: (message: { to: string; code: string; idempotencyKey: string }) => Promise<{ ok?: boolean } | null>;
  }): Promise<AuthResult>;
  export function verifyCode(store: RateStore, input: {
    email: unknown;
    code: unknown;
    ip: string;
    now: () => number;
    secret: string;
  }): Promise<AuthResult>;
  export function bumpAsk(store: RateStore, email: string, now: () => number): Promise<AuthResult>;
}

declare module '@server/mail.js' {
  export function sendSignInCode(input: {
    apiKey?: string;
    from?: string;
    to: string;
    code: string;
    idempotencyKey: string;
  }): Promise<{ ok: boolean; id?: string }>;
}

declare module '@shared/similarity.mjs' {
  export function answerFromChunks(question: string, chunks: AskChunk[], pathName: string): AskAnswer;
}

type RateStore = {
  update: (fn: (state: unknown) => Promise<AuthResult> | AuthResult) => Promise<AuthResult>;
};

type AuthResult = {
  status: number;
  body?: unknown;
  retryAfterSec?: number;
  cookie?: { value: string; maxAge: number };
};

type AskChunk = {
  id: string;
  title: string;
  content: string;
  source: string;
  paths?: string[];
};

type AskAnswer = {
  status: 'answered' | 'not_found';
  answer: string;
  citations: { id: string; label: string; source: string }[];
  score: number;
  unknownReason: string;
};
