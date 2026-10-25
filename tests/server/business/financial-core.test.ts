// Level: MOCKED. These tests prove the TypeScript wrapper contract only (result mapping, no throw, no secret logging,
// fail-closed defaults). They do NOT prove the SQL guards (PLAN_NOT_APPROVED, write-once, rule 8): that needs the
// dedicated database after F-19 (tests/db, label "DB (cyfai-sme-dev)").
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createFinancialDb } from '@/server/db/financial-core';

type RpcReply = { data: unknown; error: { code?: string } | null };

function fakeClient(reply: (fn: string, args: Record<string, unknown>) => RpcReply | Promise<RpcReply>) {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  const client = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      return reply(fn, args);
    },
  } as unknown as SupabaseClient;
  return { db: createFinancialDb(client), calls };
}

const attemptRow = {
  id: 'a1', budget_plan_id: 'p1', plan_version_id: 'v1', deployment_id: 'd1', from_address: 'G'.padEnd(56, 'A'),
  amount_stroops: '10000000', asset: { kind: 'native' }, network: 'testnet', prepared_xdr: 'SECRET-XDR',
  original_tx_hash: '0'.repeat(64), state: 'preparing', created_by: 'u1', created_at: 't', updated_at: 't', ledger: '12',
};

afterEach(() => vi.restoreAllMocks());

describe('rpc result mapping', () => {
  it('maps ok:false to the DbResult error code without throwing', async () => {
    const { db } = fakeClient(() => ({ data: { ok: false, code: 'PLAN_NOT_APPROVED' }, error: null }));
    const r = await db.beginPaymentAttempt({ scope: { kind: 'plan', planId: 'p1' }, actorUserId: 'u1' });
    expect(r).toEqual({ ok: false, code: 'PLAN_NOT_APPROVED' });
  });

  it('maps an unknown code, a transport error and a thrown error to INTERNAL', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const a = fakeClient(() => ({ data: { ok: false, code: 'SQL_BLEW_UP' }, error: null }));
    expect(await a.db.markSignatureRequested('a1')).toEqual({ ok: false, code: 'INTERNAL' });
    const b = fakeClient(() => ({ data: null, error: { code: 'PGRST202' } }));
    expect(await b.db.markSignatureRequested('a1')).toEqual({ ok: false, code: 'INTERNAL' });
    const c = fakeClient(() => { throw new Error('network down'); });
    expect(await c.db.markSignatureRequested('a1')).toEqual({ ok: false, code: 'INTERNAL' });
  });

  it('maps snake_case attempt rows to camelCase and a numeric ledger', async () => {
    const { db } = fakeClient(() => ({ data: { ok: true, value: { ...attemptRow, state: 'prepared' } }, error: null }));
    const r = await db.recordPreparation({
      attemptId: 'a1', network: 'testnet', networkPassphrase: 'p', preparedXdr: 'x', originalTxHash: '0'.repeat(64),
      historyRequestId: null, expiresAt: 't', feeStroops: '100',
    });
    expect(r.ok && r.value.state).toBe('prepared');
    expect(r.ok && r.value.originalTxHash).toBe('0'.repeat(64));
    expect(r.ok && r.value.ledger).toBe(12);
  });

  it('returns created/existing from beginPaymentAttempt with a mapped attempt', async () => {
    const { db } = fakeClient(() => ({
      data: { ok: true, value: { outcome: 'existing', attempt: attemptRow, context: { orgId: 'o1' } } }, error: null,
    }));
    const r = await db.beginPaymentAttempt({ scope: { kind: 'plan', planId: 'p1' }, actorUserId: 'u1' });
    expect(r.ok && r.value.outcome).toBe('existing');
    expect(r.ok && r.value.attempt.id).toBe('a1');
  });
});

describe('secrets and arguments', () => {
  it('never logs arguments (they can contain XDR) when an RPC fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { db } = fakeClient(() => ({ data: null, error: { code: '42501' } }));
    await db.persistSignedEnvelope({
      attemptId: 'a1', actorUserId: 'u1', signedXdr: 'SECRET-SIGNED-XDR', signedBodyHash: '0'.repeat(64), receivedAfterExpiry: false,
    });
    const logged = JSON.stringify(spy.mock.calls);
    expect(logged).not.toContain('SECRET-SIGNED-XDR');
    expect(logged).toContain('persist_signed_envelope');
  });

  it('sends the signed envelope only to the persist RPC argument, under the documented parameter names', async () => {
    const { db, calls } = fakeClient(() => ({ data: { ok: true, value: attemptRow }, error: null }));
    await db.persistSignedEnvelope({ attemptId: 'a1', actorUserId: 'u1', signedXdr: 'X', signedBodyHash: 'h', receivedAfterExpiry: true });
    expect(calls[0]).toEqual({
      fn: 'persist_signed_envelope',
      args: { p_attempt: 'a1', p_actor: 'u1', p_signed_xdr: 'X', p_body_hash: 'h', p_after_expiry: true },
    });
  });
});

describe('fail-closed helpers', () => {
  it('consumeReconcileBudget denies on error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { db } = fakeClient(() => ({ data: null, error: { code: 'x' } }));
    expect(await db.consumeReconcileBudget({ kind: 'plan', planId: 'p1' })).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });

  it('acquireReconcileLease and advanceEventCursor are false on error or a concurrent writer', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const bad = fakeClient(() => ({ data: null, error: { code: 'x' } }));
    expect(await bad.db.acquireReconcileLease('k', 'h', 30)).toBe(false);
    expect(await bad.db.advanceEventCursor('d', 'all', null, 'c')).toBe(false);
    const lost = fakeClient(() => ({ data: { ok: true, value: false }, error: null }));
    expect(await lost.db.advanceEventCursor('d', 'all', 'old', 'c')).toBe(false);
  });

  it('getWalletContext returns null on failure instead of an empty wallet', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { db } = fakeClient(() => ({ data: null, error: { code: 'x' } }));
    expect(await db.getWalletContext('u1')).toBeNull();
  });
});
