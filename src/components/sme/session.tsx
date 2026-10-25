'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SessionDTO } from '@/contracts/dto';
import { ApiClientError } from '@/client/http';
import * as data from './data';

interface SessionValue {
  session: SessionDTO;
  /** The org the user works in. The MVP has one org per demo account; the first is used. */
  org: SessionDTO['orgs'][number] | null;
  refresh(): Promise<void>;
  signOut(): Promise<void>;
}

const Ctx = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const value = useContext(Ctx);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<SessionDTO | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setSession(await data.getMe());
      setFailed(null);
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 401) router.replace('/sign-in');
      else setFailed(e instanceof ApiClientError ? e.safe.message : 'Could not load your session.');
    }
  }, [router]);

  useEffect(() => { void refresh(); }, [refresh]);

  const signOut = useCallback(async () => {
    try { await data.signOut(); } finally { router.replace('/sign-in'); }
  }, [router]);

  if (failed) {
    return <div role="alert" className="p-10 text-center text-sm text-[#7e2f23]">{failed} <button className="underline" onClick={() => void refresh()}>Retry</button></div>;
  }
  if (!session) return <div role="status" aria-live="polite" className="p-10 text-center text-sm text-[#6d7f75]">Loading your workspace…</div>;
  return <Ctx.Provider value={{ session, org: session.orgs[0] ?? null, refresh, signOut }}>{children}</Ctx.Provider>;
}
