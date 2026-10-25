// Level: MOCKED. F-14/F-17: input validation, deterministic plan hash, allowed actions, and the detail assembler against
// an in-memory fake of the database. The SQL guards themselves are proven by tests/db/business-financial.db.mjs.
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import type { SupabaseClient } from '@supabase/supabase-js';
import { computeAllowedActions, getPlanDetail, getSplitDeployment, listPlanSummaries, resolvePlanFacts, type ActionContext } from '@/server/business/plan-detail';
import { buildCanonicalPlan, parseCreatePlan } from '@/server/business/plan-input';
import { PLAN_STATES } from '@/contracts/states';
import type { HttpError } from '@/server/http/respond';

const A = (c: string) => `G${c.repeat(54)}2`;
const UID = '00000000-0000-4000-8000-0000000000aa';
const valid = () => ({
  purpose: ' October budget ', totalStroops: '10000000', signerUserId: UID,
  envelopes: [
    { position: 0, label: 'Operations', bps: 5000, recipientAddress: A('A'), planningPhpCentavos: null },
    { position: 1, label: 'Payroll', bps: 3000, recipientAddress: A('B'), planningPhpCentavos: '100' },
    { position: 2, label: 'Supplies', bps: 2000, recipientAddress: A('C') },
  ],
});
const codeOf = (fn: () => unknown) => { try { fn(); return 'ok'; } catch (e) { const h = e as HttpError; return `${h.code}${h.opts?.fields ? ':' + Object.keys(h.opts.fields).join(',') : ''}`; } };

describe('parseCreatePlan', () => {
  it('accepts a valid plan, trims, defaults PHP to null', () => {
    const p = parseCreatePlan(valid());
    expect(p.purpose).toBe('October budget');
    expect(p.envelopes[2].planningPhpCentavos).toBeNull();
  });
  it('reports per-field errors', () => {
    const b = valid() as Record<string, unknown>;
    b.totalStroops = '1.5';
    (b.envelopes as { label: string }[])[1].label = '';
    expect(codeOf(() => parseCreatePlan(b))).toBe('VALIDATION:totalStroops,envelopes.1.label');
  });
  it('refuses bps not totalling 10,000, duplicate recipients, and bad positions', () => {
    const lo = valid(); lo.envelopes[0].bps = 4000;
    expect(codeOf(() => parseCreatePlan(lo))).toBe('BPS_TOTAL_INVALID');
    const dup = valid(); dup.envelopes[1].recipientAddress = A('A');
    expect(codeOf(() => parseCreatePlan(dup))).toBe('DUPLICATE_RECIPIENT');
    const pos = valid(); pos.envelopes[1].position = 5;
    expect(codeOf(() => parseCreatePlan(pos))).toContain('envelopes.1.position');
  });
  it('rejects floats and numbers-as-strings for bps and a numeric total', () => {
    const f = valid(); (f.envelopes[0] as { bps: unknown }).bps = '5000';
    expect(codeOf(() => parseCreatePlan(f))).toContain('envelopes.0.bps');
    const n = valid() as Record<string, unknown>; n.totalStroops = 10000000;
    expect(codeOf(() => parseCreatePlan(n))).toContain('totalStroops');
  });
});

describe('buildCanonicalPlan', () => {
  const parts = { orgId: 'o', deploymentId: 'd', signerAddress: A('S'), attachmentSha256: [] };
  it('an identical plan gives an identical text and hash, independent of key order and attachment order', async () => {
    const a = await buildCanonicalPlan(parseCreatePlan(valid()), { ...parts, attachmentSha256: ['b'.repeat(64), 'a'.repeat(64)] });
    const b = await buildCanonicalPlan(parseCreatePlan(valid()), { ...parts, attachmentSha256: ['a'.repeat(64), 'b'.repeat(64)] });
    expect(a).toEqual(b);
    expect(a.planSha256).toMatch(/^[0-9a-f]{64}$/);
  });
  it('any change to the plan changes the hash', async () => {
    const base = await buildCanonicalPlan(parseCreatePlan(valid()), parts);
    const changed = valid(); changed.purpose = 'Other';
    expect((await buildCanonicalPlan(parseCreatePlan(changed), parts)).planSha256).not.toBe(base.planSha256);
    expect((await buildCanonicalPlan(parseCreatePlan(valid()), { ...parts, signerAddress: A('T') })).planSha256).not.toBe(base.planSha256);
  });
});

describe('computeAllowedActions', () => {
  const base: ActionContext = {
    state: 'pending_approval', viewerRoles: ['owner', 'signer'], viewerApprovalPending: true, viewerBindingMatchesSigner: true,
    anyAttemptEver: false, attempt: null, approved: 1, required: 3,
  };
  it('pending_approval: approve/reject, edit, and the DISABLED pay-blocked marker for the signer; no pay', () => {
    const a = computeAllowedActions(base);
    expect(a).toEqual(expect.arrayContaining(['approve', 'reject', 'edit_plan', 'pay_blocked_until_approved', 'verify_file']));
    expect(a).not.toContain('pay');
  });
  it('approved: pay only for the signer whose wallet matches, with no open attempt', () => {
    expect(computeAllowedActions({ ...base, state: 'approved', viewerApprovalPending: false })).toContain('pay');
    expect(computeAllowedActions({ ...base, state: 'approved', viewerApprovalPending: false, viewerBindingMatchesSigner: false })).not.toContain('pay');
    expect(computeAllowedActions({ ...base, state: 'approved', viewerApprovalPending: false, viewerRoles: ['approver'] })).not.toContain('pay');
  });
  it('no edit after any payment attempt existed', () => {
    const a = computeAllowedActions({ ...base, state: 'approved', anyAttemptEver: true, viewerApprovalPending: false });
    expect(a).not.toContain('edit_plan');
  });
  it('payment states: continue, check, resubmit and refresh follow the attempt', () => {
    const prepared = computeAllowedActions({ ...base, state: 'payment_pending', viewerApprovalPending: false, anyAttemptEver: true,
      attempt: { state: 'prepared', expired: false, hasSignedEnvelope: false, finalStatus: null } });
    expect(prepared).toEqual(expect.arrayContaining(['continue_payment', 'refresh_evidence']));
    const expired = computeAllowedActions({ ...base, state: 'payment_pending', viewerApprovalPending: false, anyAttemptEver: true,
      attempt: { state: 'prepared', expired: true, hasSignedEnvelope: false, finalStatus: null } });
    expect(expired).not.toContain('continue_payment');
    const unknown = computeAllowedActions({ ...base, state: 'payment_pending', viewerApprovalPending: false, anyAttemptEver: true,
      attempt: { state: 'unknown', expired: false, hasSignedEnvelope: true, finalStatus: 'NOT_FOUND' } });
    expect(unknown).toEqual(expect.arrayContaining(['check_payment', 'resubmit_same_envelope']));
    const done = computeAllowedActions({ ...base, state: 'payment_confirmed', viewerApprovalPending: false, anyAttemptEver: true,
      attempt: { state: 'success', expired: false, hasSignedEnvelope: true, finalStatus: 'SUCCESS' } });
    expect(done).not.toContain('resubmit_same_envelope');
    expect(done).not.toContain('check_payment');
  });
  it('the operator and outsiders get no actions', () => {
    expect(computeAllowedActions({ ...base, viewerRoles: ['operator'], viewerApprovalPending: false })).toEqual([]);
  });
});

// ---- in-memory fake of the PostgREST builder (select/eq/in/is/order/limit/maybeSingle) ----
type Row = Record<string, unknown>;
function fakeDb(tables: Record<string, Row[]>): SupabaseClient {
  const from = (name: string) => {
    let data = [...(tables[name] ?? [])];
    const q: Record<string, unknown> = {};
    q.select = (cols?: string) => { void cols; return q; }; // columns are not filtered: tests assert what the assembler MAPS
    q.eq = (k: string, v: unknown) => { data = data.filter((r) => r[k] === v); return q; };
    q.in = (k: string, vs: unknown[]) => { data = data.filter((r) => vs.includes(r[k])); return q; };
    q.is = (k: string, v: unknown) => { data = data.filter((r) => (r[k] ?? null) === v); return q; };
    q.order = (k: string, o?: { ascending?: boolean }) => { const asc = o?.ascending !== false; data.sort((a, b) => (a[k]! > b[k]! ? 1 : -1) * (asc ? 1 : -1)); return q; };
    q.limit = (n: number) => { data = data.slice(0, n); return q; };
    q.maybeSingle = async () => ({ data: data[0] ?? null, error: null });
    q.then = (res: (v: unknown) => unknown) => Promise.resolve({ data, error: null }).then(res);
    return q;
  };
  return { from } as unknown as SupabaseClient;
}

const OWNER = '00000000-0000-4000-8000-000000000010';
const APP1 = '00000000-0000-4000-8000-000000000011';
const ORG = '00000000-0000-4000-8000-000000000001';
const PLAN = '00000000-0000-4000-8000-000000000002';
const VER = '00000000-0000-4000-8000-000000000003';
const hex = (n: number) => n.toString(16).padStart(64, '0');

function world(over: { planState?: string; attempt?: Row | null; verifs?: Row[] } = {}) {
  return fakeDb({
    budget_plans: [{ id: PLAN, org_id: ORG, deployment_id: 'dep', state: over.planState ?? 'payment_confirmed', current_version_id: VER, created_at: 't', updated_at: 'u' }],
    budget_plan_versions: [{ id: VER, plan_id: PLAN, version: 1, purpose: 'Budget', plan_sha256: hex(1), total_stroops: '10000001', signer_user_id: OWNER, signer_address: A('S'), superseded_at: null, created_at: 'c' }],
    budget_envelopes: [
      { version_id: VER, position: 0, label: 'Ops', bps: 5000, recipient_address: A('A'), planning_php_centavos: null },
      { version_id: VER, position: 1, label: 'Pay', bps: 3000, recipient_address: A('B'), planning_php_centavos: 500 },
      { version_id: VER, position: 2, label: 'Sup', bps: 2000, recipient_address: A('C'), planning_php_centavos: null },
    ],
    budget_approvals: [
      { version_id: VER, approver_user_id: OWNER, decision: 'approved', responded_at: 'r', reason: null },
      { version_id: VER, approver_user_id: APP1, decision: 'approved', responded_at: 'r', reason: null },
    ],
    org_memberships: [{ org_id: ORG, user_id: OWNER, role: 'owner' }, { org_id: ORG, user_id: APP1, role: 'approver' }],
    profiles: [{ user_id: OWNER, display_name: 'Owner' }, { user_id: APP1, display_name: 'Approver' }],
    wallet_bindings: [{ user_id: OWNER, address: A('S'), revoked_at: null }],
    payment_attempts: over.attempt === null ? [] : [over.attempt ?? { id: 'att', budget_plan_id: PLAN, state: 'success', original_tx_hash: hex(200), expires_at: null, updated_at: 'u', final_status: 'SUCCESS', ledger: '9', signed_body_hash: hex(200), last_checked_at: 'l', created_at: 'c1',
      prepared_xdr: 'SECRET-PREPARED', signed_xdr: 'SECRET-SIGNED', last_request_id: 'SECRET-REQ', history_request_id: 'SECRET-HIST' }],
    payout_verifications: over.verifs ?? [
      { attempt_id: 'att', kind: 'payment_receipt', envelope_position: null, state: 'verified', tx_hash: hex(200), expected_recipient: A('S'), expected_amount_stroops: '10000001', observed_amount_stroops: '10000001', event_ids: [], checked_at: 'k', notes: null },
      { attempt_id: 'att', kind: 'envelope_payout', envelope_position: 0, state: 'verified', tx_hash: hex(300), expected_recipient: A('A'), expected_amount_stroops: '5000000', observed_amount_stroops: '5000000', event_ids: ['e0'], checked_at: 'k', notes: null },
      { attempt_id: 'att', kind: 'envelope_payout', envelope_position: 1, state: 'awaiting_events', tx_hash: null, expected_recipient: A('B'), expected_amount_stroops: '3000000', observed_amount_stroops: null, event_ids: [], checked_at: null, notes: null },
    ],
    transactions: [{ plan_id: PLAN, action_type: 'plan_create', description: 'Budget plan created', tx_hash: hex(900), metadata: { planSha256: hex(1) }, created_at: 't1', actor_user_id: OWNER, hash_input: { ledgerBlockId: 7 } },
      { plan_id: PLAN, action_type: 'pay_confirmed', description: 'Payment transaction confirmed', tx_hash: hex(901), metadata: { originalTxHash: hex(200) }, created_at: 't2', actor_user_id: OWNER, hash_input: {} }],
    paiflow_deployments: [], org_documents: [],
  });
}

describe('getPlanDetail', () => {
  it.each(PLAN_STATES)('matches a browser-safe detail snapshot for the %s plan state', async (state) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-25T00:00:00.000Z'));
    try {
      const detail = await getPlanDetail(world({ planState: state, attempt: null, verifs: [] }), ORG, PLAN, { userId: OWNER, isOperator: false });
      expect(detail).toMatchSnapshot();
    } finally {
      vi.useRealTimers();
    }
  });

  it('assembles shares (remainder on last), "k of n payouts verified" from verifications only, and viewer roles', async () => {
    const d = await getPlanDetail(world(), ORG, PLAN, { userId: OWNER, isOperator: false });
    expect(d.envelopes.map((e) => e.expectedShareStroops)).toEqual(['5000000', '3000000', '2000001']);
    expect(d.payoutsVerified).toEqual({ verified: 1, total: 3 });
    expect(d.dashboardState).toBe('pending');
    expect(d.viewerRoles).toEqual(['owner', 'signer']);
    expect(d.approvals).toEqual({ approved: 2, required: 2 });
    expect(d.signer).toEqual({ displayName: 'Owner', address: A('S') });
    expect(d.ledgerBlockId).toBe(7);
    expect(d.envelopes[1].planningPhpCentavos).toBe('500');
  });
  it('never exposes XDR, request IDs or the word tampered; CYFER audit hashes stay in auditHash', async () => {
    const d = await getPlanDetail(world(), ORG, PLAN, { userId: OWNER, isOperator: false });
    const json = JSON.stringify(d);
    for (const secret of ['SECRET-PREPARED', 'SECRET-SIGNED', 'SECRET-REQ', 'SECRET-HIST']) expect(json).not.toContain(secret);
    expect(d.payment).toEqual(expect.objectContaining({ hasSignedEnvelope: true, state: 'success' }));
    expect(Object.keys(d.payment!)).not.toContain('preparedXdr');
    expect(d.timeline[1].auditHash).toBe(hex(901));
    expect(d.timeline[1].stellarTxHash).toBe(hex(200));
    expect(d.timeline[0].stellarTxHash).toBeUndefined();
  });
  it('NOT_FOUND for a plan in another organisation', async () => {
    await expect(getPlanDetail(world(), '00000000-0000-4000-8000-0000000000ff', PLAN, { userId: OWNER, isOperator: false })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
  it('an operator who is not a member sees the plan but gets no actions', async () => {
    const d = await getPlanDetail(world(), ORG, PLAN, { userId: '00000000-0000-4000-8000-0000000000ee', isOperator: true });
    expect(d.viewerRoles).toEqual(['operator']);
    expect(d.allowedActions).toEqual([]);
  });
  it('approver view: isViewer and pending approve action only while pending_approval', async () => {
    const d = await getPlanDetail(world({ planState: 'pending_approval', attempt: null, verifs: [] }), ORG, PLAN, { userId: APP1, isOperator: false });
    expect(d.approvalsDetail.find((a) => a.isViewer)?.approverName).toBe('Approver');
    expect(d.payment).toBeNull();
  });
});

describe('listPlanSummaries / deployment lookups', () => {
  it('summarises approvals from the current version', async () => {
    const [s] = await listPlanSummaries(world(), ORG);
    expect(s).toMatchObject({ planId: PLAN, purpose: 'Budget', approvals: { approved: 2, required: 2 }, dashboardState: 'pending' });
  });
  it('split deployment: none, one, and ambiguous', async () => {
    const dep = (id: string) => ({ id, template: 'budget_split', status: 'available', network: 'testnet', input_asset: { kind: 'native' },
      split_recipients: [{ position: 0, address: A('A'), bps: 5000 }, { position: 1, address: A('B'), bps: 3000 }, { position: 2, address: A('C'), bps: 2000 }] });
    await expect(getSplitDeployment(fakeDb({ paiflow_deployments: [] }))).rejects.toMatchObject({ code: 'NO_SPLIT_DEPLOYMENT' });
    expect((await getSplitDeployment(fakeDb({ paiflow_deployments: [dep('d1')] }))).deploymentId).toBe('d1');
    await expect(getSplitDeployment(fakeDb({ paiflow_deployments: [dep('d1'), dep('d2')] }))).rejects.toMatchObject({ code: 'AMBIGUOUS_DEPLOYMENT_MATCH' });
  });
  it('resolvePlanFacts: envelopes that match no deployment are refused; the deployment never comes from input', async () => {
    const deps = [{ id: 'd1', template: 'budget_split', status: 'available', network: 'testnet', input_asset: { kind: 'native' },
      split_recipients: [{ position: 0, address: A('A'), bps: 5000 }, { position: 1, address: A('B'), bps: 3000 }, { position: 2, address: A('C'), bps: 2000 }] }];
    const db = fakeDb({ paiflow_deployments: deps, wallet_bindings: [{ user_id: UID, address: A('S'), revoked_at: null }] });
    const ok = await resolvePlanFacts(db, ORG, parseCreatePlan(valid()));
    expect(ok).toMatchObject({ deploymentId: 'd1', signerAddress: A('S') });
    const other = valid(); other.envelopes[2].recipientAddress = A('Z');
    await expect(resolvePlanFacts(db, ORG, parseCreatePlan(other))).rejects.toMatchObject({ code: 'ENVELOPES_MISMATCH_DEPLOYMENT' });
    await expect(resolvePlanFacts(fakeDb({ paiflow_deployments: deps, wallet_bindings: [] }), ORG, parseCreatePlan(valid()))).rejects.toMatchObject({ code: 'WALLET_MISMATCH' });
  });
});
