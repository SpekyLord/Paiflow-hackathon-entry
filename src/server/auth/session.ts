import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { OrgRole } from '@/contracts/states';
import type { SessionDTO } from '@/contracts/dto';
import { getServiceClient } from '@/server/db/client';

// Cookie sessions via @supabase/ssr (F-03). No token is ever held in browser JavaScript.

/** Anon-key client bound to the request cookies. Used only for sign-in, sign-out and verifying the session. */
export async function createAuthClient(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('Supabase auth configuration is missing');
  const store = await cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet) => {
        try {
          // No browser Supabase client exists in CYFER, so the session cookie is never read by JavaScript: force HttpOnly.
          for (const { name, value, options } of toSet) {
            store.set(name, value, { ...options, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
          }
        } catch {
          // Called where cookies are read-only (not a route handler). Refreshed cookies are written by the next mutation.
        }
      },
    },
  });
}

/**
 * Verified user ID or null. Uses getUser(), which asks the auth server and so detects revoked or tampered sessions.
 * getSession()/getClaims() only read the cookie and must NOT be used for authorisation.
 */
export async function getAuthUserId(): Promise<string | null> {
  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

/** Build the SessionDTO from server tables only (never user_metadata). Null when the user has no profile. */
export async function loadSession(userId: string): Promise<SessionDTO | null> {
  const db = getServiceClient();
  const [profile, binding, memberships] = await Promise.all([
    db.from('profiles').select('display_name, is_operator').eq('user_id', userId).maybeSingle(),
    db.from('wallet_bindings').select('address, verified_at').eq('user_id', userId).is('revoked_at', null).maybeSingle(),
    db.from('org_memberships').select('org_id, role, organisations(name)').eq('user_id', userId),
  ]);
  if (profile.error || binding.error || memberships.error || !profile.data) return null;
  const rows = (memberships.data ?? []) as unknown as { org_id: string; role: OrgRole; organisations: { name: string } | { name: string }[] | null }[];
  return {
    userId,
    displayName: profile.data.display_name as string,
    isOperator: profile.data.is_operator === true,
    binding: binding.data ? { address: binding.data.address as string, verifiedAt: binding.data.verified_at as string } : null,
    orgs: rows.map((m) => ({
      orgId: m.org_id,
      role: m.role,
      name: (Array.isArray(m.organisations) ? m.organisations[0]?.name : m.organisations?.name) ?? '',
    })),
  };
}
