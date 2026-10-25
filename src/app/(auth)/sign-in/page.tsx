'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClientError } from '@/client/http';
import * as data from '@/components/sme/data';
import { ErrorNotice, FixtureBanner, TestnetChip, btnPrimary, inputCls, labelCls } from '@/components/sme/evidence';

// S-11. Accounts are pre-provisioned; there is no sign-up. Errors are generic on purpose:
// never reveal whether an account exists.
function message(e: unknown): string {
  if (e instanceof ApiClientError) {
    if (e.status === 429) {
      const s = e.safe.retryAfterMs ? Math.ceil(e.safe.retryAfterMs / 1000) : null;
      return `Too many attempts. Try again${s ? ` in ${s} seconds` : ' shortly'}.`;
    }
    if (e.status === 400 || e.status === 401) return 'Email or password is incorrect.';
  }
  return 'Sign-in is unavailable right now. Try again shortly.';
}

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await data.signIn({ email, password });
      router.replace('/plans');
    } catch (e) {
      setError(message(e));
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f6f2] text-[#142c27]">
      <FixtureBanner />
      <main id="main" className="mx-auto flex min-h-[80vh] max-w-[420px] flex-col justify-center px-5 py-12">
        <div className="mb-6 flex items-center justify-between">
          <span className="text-[17px] font-semibold tracking-[-0.04em]">CYFER <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5f7167]">for SMEs</span></span>
          <TestnetChip />
        </div>
        <h1 className="font-serif text-[34px] font-semibold tracking-[-0.04em] text-[#173b30]">Sign in</h1>
        <p className="mt-2 text-sm leading-6 text-[#5f7167]">Use the account your organisation gave you. Testnet — simulation, no real money.</p>
        <form onSubmit={submit} className="mt-6 space-y-5 rounded-xl border border-[#e2e9e2] bg-white p-6">
          <div>
            <label htmlFor="email" className={labelCls}>Email</label>
            <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputCls} mt-2`} />
          </div>
          <div>
            <label htmlFor="password" className={labelCls}>Password</label>
            <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputCls} mt-2`} />
          </div>
          <div aria-live="polite">{error && <ErrorNotice message={error} />}</div>
          <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </main>
    </div>
  );
}
