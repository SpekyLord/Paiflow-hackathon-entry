// Level: MOCKED. F-16: the approve/reject route layer (auth, origin, validation, error mapping). The SQL rules behind it
// (once-only publish, duplicates, stale version, non-approver) are proven by tests/db/*.db.mjs.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const state = { userId: 'u1' as string | null, role: 'approver' as string | null, decide: vi.fn() };

vi.mock('@/server/auth/guards', async () => {
  const { HttpError } = await import('@/server/http/respond');
  return {
    parseUuid: (v: string) => v,
    requireOrgRole: async (orgId: string, roles: string[]) => {
      if (!state.userId) throw new HttpError('UNAUTHENTICATED');
      if (!state.role) throw new HttpError('NOT_MEMBER');
      if (!roles.includes(state.role)) throw new HttpError('FORBIDDEN');
      return { userId: state.userId, orgId, role: state.role };
    },
  };
});
vi.mock('@/server/db/business', () => ({ decideBudgetPlan: (...a: unknown[]) => state.decide(...a) }));
vi.mock('@/server/business/service', () => ({ detailFor: async () => ({ planId: 'p', state: 'approved' }) }));

import { decisionRoute } from '@/server/business/decision';
import { resetRateLimits } from '@/server/http/rate-limit';

const VER = '00000000-0000-4000-8000-000000000003';
const SHA = 'a'.repeat(64);
const ctx = { params: Promise.resolve({ orgId: 'o1', planId: 'p1' }) };
const req = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('http://localhost:3000/x', { method: 'POST', body: JSON.stringify(body), headers: { origin: 'http://localhost:3000', 'content-type': 'application/json', ...headers } });
const approve = decisionRoute('approved');
const reject = decisionRoute('rejected');

beforeEach(() => { state.userId = 'u1'; state.role = 'approver'; state.decide = vi.fn(async () => ({ ok: true, value: {} })); resetRateLimits(); });

describe('approve route', () => {
  it('passes the version and hash the page showed to the database, never trusting the plan state', async () => {
    const res = await approve(req({ versionId: VER, planSha256: SHA }), ctx);
    expect(res.status).toBe(200);
    expect(state.decide).toHaveBeenCalledWith({ actorUserId: 'u1', planId: 'p1', versionId: VER, planSha256: SHA, decision: 'approved', reason: null });
  });
  it('422 when the version or hash is missing; the database is not called', async () => {
    const res = await approve(req({}), ctx);
    expect(res.status).toBe(422);
    expect(state.decide).not.toHaveBeenCalled();
  });
  it('maps a stale version to 409 STALE_VERSION and a non-snapshotted approver to 403', async () => {
    state.decide = vi.fn(async () => ({ ok: false, code: 'STALE_VERSION' }));
    const stale = await approve(req({ versionId: VER, planSha256: SHA }), ctx);
    expect([stale.status, (await stale.json()).error.code]).toEqual([409, 'STALE_VERSION']);
    state.decide = vi.fn(async () => ({ ok: false, code: 'FORBIDDEN' }));
    expect((await approve(req({ versionId: VER, planSha256: SHA }), ctx)).status).toBe(403);
  });
  it('a plain member is refused before the database; a cross-origin request is 403', async () => {
    state.role = 'member';
    expect((await approve(req({ versionId: VER, planSha256: SHA }), ctx)).status).toBe(403);
    state.role = 'approver';
    expect((await approve(req({ versionId: VER, planSha256: SHA }, { origin: 'https://evil.example' }), ctx)).status).toBe(403);
    expect(state.decide).not.toHaveBeenCalled();
  });
  it('rate limits approvals per user with Retry-After', async () => {
    let last = 200; let retry: string | null = null;
    for (let i = 0; i < 32; i++) { const r = await approve(req({ versionId: VER, planSha256: SHA }), ctx); last = r.status; retry = r.headers.get('retry-after'); }
    expect(last).toBe(429);
    expect(Number(retry)).toBeGreaterThan(0);
  });
});

describe('reject route', () => {
  it('requires a reason and sends it only on rejection', async () => {
    expect((await reject(req({ versionId: VER, planSha256: SHA }), ctx)).status).toBe(422);
    const ok = await reject(req({ versionId: VER, planSha256: SHA, reason: '  too high ' }), ctx);
    expect(ok.status).toBe(200);
    expect(state.decide).toHaveBeenCalledWith(expect.objectContaining({ decision: 'rejected', reason: 'too high' }));
  });
  it('rejects an oversize reason', async () => {
    expect((await reject(req({ versionId: VER, planSha256: SHA, reason: 'x'.repeat(501) }), ctx)).status).toBe(422);
  });
});
