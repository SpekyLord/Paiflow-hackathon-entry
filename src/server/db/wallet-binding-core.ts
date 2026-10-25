// Wallet challenge RPC wrappers (migration 002). The service-role binding lives in wallet-binding.ts.
import type { SupabaseClient } from '@supabase/supabase-js';
import { ERROR_HTTP_STATUS, type ErrorCode } from '@/contracts/errors';

export type WalletDbResult<T> = { ok: true; value: T } | { ok: false; code: ErrorCode };

export interface WalletChallenge {
  challengeId: string;
  address: string;
  nonce: string;
  origin: string;
  purpose: 'wallet-binding';
  expiresAt: string;
}

export interface IssuedWalletChallenge {
  challengeId: string;
  nonce: string;
  origin: string;
  purpose: 'wallet-binding';
  expiresAt: string;
}

export interface WalletBindingResult { address: string; verifiedAt: string }

const KNOWN_CODES = new Set<string>(Object.keys(ERROR_HTTP_STATUS));
const isCode = (value: unknown): value is ErrorCode => typeof value === 'string' && KNOWN_CODES.has(value);

export function createWalletBindingDb(client: SupabaseClient) {
  async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<WalletDbResult<T>> {
    let response: { data: unknown; error: { code?: string } | null };
    try {
      response = (await client.rpc(fn, args)) as typeof response;
    } catch {
      console.error('[db] wallet rpc threw', fn);
      return { ok: false, code: 'INTERNAL' };
    }
    if (response.error) {
      console.error('[db] wallet rpc error', fn, response.error.code ?? 'unknown');
      return { ok: false, code: 'INTERNAL' };
    }
    const body = response.data as { ok?: boolean; value?: T; code?: unknown } | null;
    if (body?.ok === true && body.value !== undefined) return { ok: true, value: body.value };
    if (body?.ok === false && isCode(body.code)) return { ok: false, code: body.code };
    return { ok: false, code: 'INTERNAL' };
  }

  return {
    issueWalletChallenge: (input: { userId: string; address: string; origin: string; ttlSeconds: number }) =>
      rpc<IssuedWalletChallenge>('issue_wallet_challenge', {
        p_user: input.userId, p_address: input.address, p_origin: input.origin, p_ttl_seconds: input.ttlSeconds,
      }),
    getWalletChallenge: (userId: string, challengeId: string) =>
      rpc<WalletChallenge>('get_wallet_challenge', { p_user: userId, p_challenge: challengeId }),
    consumeChallengeAndBind: (userId: string, challengeId: string, address: string) =>
      rpc<WalletBindingResult>('consume_challenge_and_bind', { p_user: userId, p_challenge: challengeId, p_address: address }),
    unbindWallet: (userId: string) => rpc<Record<string, never>>('unbind_wallet', { p_user: userId }),
  };
}

export type WalletBindingDb = ReturnType<typeof createWalletBindingDb>;
