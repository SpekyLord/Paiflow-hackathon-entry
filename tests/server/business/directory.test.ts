// Level: MOCKED. CR-03: members list (names and roles only) and the organisation-wide plan-version index.
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import type { SupabaseClient } from '@supabase/supabase-js';
import { listOrgMembers, listPlanVersionIndex } from '@/server/business/directory';

type Row = Record<string, unknown>;
function fakeDb(tables: Record<string, Row[]>): SupabaseClient {
  const from = (name: string) => {
    let data = [...(tables[name] ?? [])];
    const q: Record<string, unknown> = {};
    q.select = () => q;
    q.eq = (k: string, v: unknown) => { data = data.filter((r) => r[k] === v); return q; };
    q.in = (k: string, vs: unknown[]) => { data = data.filter((r) => vs.includes(r[k])); return q; };
    q.is = (k: string, v: unknown) => { data = data.filter((r) => (r[k] ?? null) === v); return q; };
    q.order = (k: string, o?: { ascending?: boolean }) => { const asc = o?.ascending !== false; data.sort((a, b) => ((a[k] as string) > (b[k] as string) ? 1 : -1) * (asc ? 1 : -1)); return q; };
    q.limit = (n: number) => { data = data.slice(0, n); return q; };
    q.then = (res: (v: unknown) => unknown) => Promise.resolve({ data, error: null }).then(res);
    return q;
  };
  return { from } as unknown as SupabaseClient;
}

const ORG = 'org-1';
const db = fakeDb({
  org_memberships: [
    { org_id: ORG, user_id: 'u-m', role: 'member' }, { org_id: ORG, user_id: 'u-a', role: 'approver' },
    { org_id: ORG, user_id: 'u-o', role: 'owner' }, { org_id: 'other', user_id: 'u-x', role: 'owner' },
  ],
  profiles: [
    { user_id: 'u-m', display_name: 'Mia', email: 'mia@secret.test', is_operator: true },
    { user_id: 'u-a', display_name: 'Ana', email: 'ana@secret.test' }, { user_id: 'u-o', display_name: 'Omar', email: 'omar@secret.test' },
    { user_id: 'u-x', display_name: 'Elsewhere' },
  ],
  wallet_bindings: [
    { user_id: 'u-o', address: 'GSECRETADDRESS', revoked_at: null }, { user_id: 'u-a', address: 'GOLD', revoked_at: '2026-01-01' },
  ],
  budget_plans: [{ id: 'p1', org_id: ORG }, { id: 'p-other', org_id: 'other' }],
  budget_plan_versions: [
    { id: 'v1', plan_id: 'p1', version: 1, purpose: 'First', plan_sha256: 'a'.repeat(64), created_at: '2026-10-25T01:00:00Z', superseded_at: '2026-10-25T02:00:00Z' },
    { id: 'v2', plan_id: 'p1', version: 2, purpose: 'Second', plan_sha256: 'b'.repeat(64), created_at: '2026-10-25T02:00:00Z', superseded_at: null },
    { id: 'vx', plan_id: 'p-other', version: 1, purpose: 'Other org', plan_sha256: 'c'.repeat(64), created_at: '2026-10-25T03:00:00Z', superseded_at: null },
  ],
});

describe('listOrgMembers', () => {
  it('lists only this organisation, owner first, with a wallet flag and the viewer marked', async () => {
    const m = await listOrgMembers(db, ORG, 'u-a');
    expect(m.map((x) => [x.displayName, x.role, x.hasVerifiedWallet, x.isViewer])).toEqual([
      ['Omar', 'owner', true, false], ['Ana', 'approver', false, true], ['Mia', 'member', false, false],
    ]);
  });
  it('never exposes emails, wallet addresses or the operator flag', async () => {
    const json = JSON.stringify(await listOrgMembers(db, ORG, 'u-a'));
    for (const secret of ['secret.test', 'GSECRETADDRESS', 'GOLD', 'is_operator', 'isOperator', 'email']) expect(json).not.toContain(secret);
  });
  it('an organisation with no members is an empty list', async () => {
    expect(await listOrgMembers(db, 'nobody', 'u')).toEqual([]);
  });
});

describe('listPlanVersionIndex', () => {
  it('returns every version of this organisation\'s plans, newest first, and none of another organisation\'s', async () => {
    const v = await listPlanVersionIndex(db, ORG);
    expect(v.map((x) => [x.versionId, x.version, x.superseded])).toEqual([['v2', 2, false], ['v1', 1, true]]);
    expect(v.some((x) => x.versionId === 'vx')).toBe(false);
    expect(v[0]).toMatchObject({ planId: 'p1', purpose: 'Second', planSha256: 'b'.repeat(64) });
  });
  it('is empty when there are no plans', async () => {
    expect(await listPlanVersionIndex(db, 'nobody')).toEqual([]);
  });
});
