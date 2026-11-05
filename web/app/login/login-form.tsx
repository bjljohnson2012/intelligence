'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);

  async function requestCode(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage('');
    try {
      const response = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const body = await response.json() as { message?: string };
      if (response.status === 429) setMessage(body.message || 'Too many codes for now.');
      else if (!response.ok) setMessage('Check the address and try again.');
      else {
        setSent(true);
        setMessage('If this address can sign in, a code is on the way. It expires in 5 minutes.');
      }
    } catch {
      setMessage('Sign-in could not be reached.');
    } finally {
      setPending(false);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage('');
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      if (!response.ok) {
        const body = await response.json() as { message?: string };
        setMessage(body.message || 'That code did not work.');
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setMessage('Sign-in could not be reached.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-line bg-white p-6 shadow-card">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">MB Intelligence</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-navy">Sign in</h1>
      <p className="mt-2 text-sm leading-6 text-ink">A code by email. Live Core stays HOLD. This is a planning view.</p>
      <form onSubmit={sent ? verify : requestCode} className="mt-5 space-y-3">
        <label className="block text-xs font-medium text-muted">
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="username" required className="mt-1 h-10 w-full rounded-md border border-line px-3 text-sm text-ink outline-none focus:border-accent" />
        </label>
        {sent ? (
          <label className="block text-xs font-medium text-muted">
            Code
            <input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required className="mt-1 h-10 w-full rounded-md border border-line px-3 text-sm tracking-[0.2em] text-ink outline-none focus:border-accent" />
          </label>
        ) : null}
        <Button type="submit" disabled={pending}>{pending ? 'Working' : sent ? 'Open the plan' : 'Email me a code'}</Button>
      </form>
      {message ? <p className="mt-3 text-sm leading-6 text-ink">{message}</p> : null}
    </div>
  );
}
