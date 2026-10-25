// Level: DB (cyfai-sme-dev). Runs the real SQL functions from migrations 002-009 inside transactions that are ALWAYS rolled
// back, so no data is left behind. Needs SUPABASE_DB_URL in .env.local and a directory that contains the `pg` package.
// Not part of `npm test` (name ends .db.mjs on purpose). Usage: node tests/db/business-financial.db.mjs <dir-with-pg>
// Not covered here: true concurrency (two committed sessions). Evidence tables refuse deletes, so a committed
// concurrency test would leave permanent rows. The SQL relies on the plan row lock; see FRANCIS-PHASETASK G7.
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const { Client } = createRequire(join(resolve(process.argv[2]), 'package.json'))('pg');
const env = Object.fromEntries(readFileSync(join(import.meta.dirname, '..', '..', '.env.local'), 'utf8').split(/\r?\n/)
  .filter((l) => l && !l.startsWith('#') && l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim()]; }));
const db = new Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await db.connect();

// ---------- tiny helpers ----------
const q = (sql, params = []) => db.query(sql, params);
const call = async (fn, ...args) => (await q(`select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(',')}) r`, args)).rows[0].r;
const addr = (c) => `G${c.repeat(54)}2`;
const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
const hex = (n) => n.toString(16).padStart(64, '0');
function canonical(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
}
const assert = (cond, msg) => { if (!cond) throw new Error(`assertion failed: ${msg}`); };
const eq = (a, b, msg) => assert(JSON.stringify(a) === JSON.stringify(b), `${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const okOf = (r, msg) => { assert(r && r.ok === true, `${msg}: expected ok, got ${JSON.stringify(r)}`); return r.value; };
const codeOf = (r, code, msg) => eq(r && r.ok === false ? r.code : r, code, msg);
async function sqlFails(sql, params, pattern, msg) {
  await q('savepoint s1');
  let err = null;
  try { await q(sql, params); } catch (e) { err = e; }
  await q('rollback to savepoint s1');
  assert(err && pattern.test(err.message), `${msg}: expected error matching ${pattern}, got ${err ? err.message : 'no error'}`);
}

const SPLIT = [
  { position: 0, label: 'Operations', bps: 5000, recipientAddress: addr('A') },
  { position: 1, label: 'Payroll', bps: 3000, recipientAddress: addr('B') },
  { position: 2, label: 'Supplies', bps: 2000, recipientAddress: addr('C') },
];

function planInput(f, over = {}) {
  const envelopes = (over.envelopes ?? SPLIT).map((e) => ({ ...e, planningPhpCentavos: null }));
  const total = over.totalStroops ?? '10000000';
  const purpose = over.purpose ?? 'October budget';
  const text = canonical({
    asset: { kind: 'native' }, deploymentId: f.deploymentId, envelopes, purpose,
    signerAddress: over.signerAddress ?? f.addrs.owner, totalStroops: total,
  });
  return { purpose, totalStroops: total, signerUserId: over.signerUserId ?? f.ids.owner, envelopes,
    canonicalText: text, planSha256: over.planSha256 ?? sha(text) };
}

let fixtureCounter = 0;
// unique wallet addresses per fixture: G + 52 x letter + 2 counter letters + '2' (56 chars, valid alphabet)
const uniqueAddr = (c, n) => `G${c.repeat(52)}${String.fromCharCode(65 + (n % 26))}${String.fromCharCode(65 + Math.floor(n / 26) % 26)}2`;
async function base({ createPlan = true } = {}) {
  const n = ++fixtureCounter;
  const ids = Object.fromEntries(['owner', 'a1', 'a2', 'member', 'operator', 'outsider'].map((k) => [k, randomUUID()]));
  const addrs = { owner: uniqueAddr('S', n), a1: uniqueAddr('T', n), a2: uniqueAddr('U', n), member: uniqueAddr('V', n) };
  for (const [k, id] of Object.entries(ids)) {
    await q("insert into auth.users(id, aud, role, email) values ($1,'authenticated','authenticated',$2)", [id, `${k}-${id}@example.test`]);
    await q('insert into public.profiles(user_id, display_name, is_operator) values ($1,$2,$3)', [id, k, k === 'operator']);
  }
  const orgId = randomUUID();
  await q('insert into public.organisations(id, name) values ($1, $2)', [orgId, 'Test SME']);
  for (const [k, role] of [['owner', 'owner'], ['a1', 'approver'], ['a2', 'approver'], ['member', 'member']]) {
    await q('insert into public.org_memberships(org_id, user_id, role) values ($1,$2,$3)', [orgId, ids[k], role]);
    await q('insert into public.wallet_bindings(user_id, address) values ($1,$2)', [ids[k], addrs[k]]);
  }
  const deploymentId = randomUUID();
  await q(`insert into public.paiflow_deployments(id, template, split_recipients, graph_snapshot_sha256, status)
           values ($1,'budget_split',$2::jsonb,$3,'available')`,
    [deploymentId, JSON.stringify(SPLIT.map((e) => ({ position: e.position, address: e.recipientAddress, bps: e.bps, label: e.label }))), hex(1)]);
  const f = { ids, addrs, orgId, deploymentId };
  if (createPlan) {
    const v = okOf(await call('create_budget_plan', ids.owner, orgId, planInput(f)), 'create_budget_plan');
    Object.assign(f, { planId: v.planId, versionId: v.versionId, planSha: v.planSha256 });
  }
  return f;
}
const approve = (f, who, over = {}) =>
  call('decide_budget_plan', f.ids[who], f.planId, over.versionId ?? f.versionId, over.sha ?? f.planSha, over.decision ?? 'approved', over.reason ?? null);
async function approveAll(f) { for (const w of ['owner', 'a1', 'a2']) okOf(await approve(f, w), `approve ${w}`); }
const planState = async (f) => (await q('select state from public.budget_plans where id=$1', [f.planId])).rows[0].state;
const attemptRow = async (id) => (await q('select * from public.payment_attempts where id=$1', [id])).rows[0];
const future = () => new Date(Date.now() + 10 * 60_000).toISOString();

async function toPrepared(f, txHash = hex(200)) {
  const b = okOf(await call('begin_payment_attempt', f.planId, f.ids.owner), 'begin');
  okOf(await call('record_preparation', b.attempt.id, 'testnet', 'Test SDF Network ; September 2015', 'PREPARED-XDR', txHash, null, future(), '100'), 'record_preparation');
  return b.attempt.id;
}
async function toSigned(f, txHash = hex(200)) {
  const id = await toPrepared(f, txHash);
  okOf(await call('persist_signed_envelope', id, f.ids.owner, 'SIGNED-XDR', txHash, false), 'persist');
  return id;
}
const found = (status, txHash = hex(200), network = 'testnet') => ({ kind: 'found', status, txHash, network, ledger: 7 });
const verif = (f, i, over = {}) => ({
  state: 'verified', stellarTxHash: hex(300 + i), expectedAddress: SPLIT[i].recipientAddress,
  expectedAmountStroops: ['5000000', '3000000', '2000000'][i], observedAmountStroops: ['5000000', '3000000', '2000000'][i],
  asset: { kind: 'native' }, eventIds: [`ev${i}`], checks: {}, note: null, ...over,
});

// ---------- tests ----------
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test('create_budget_plan: ok, reserves the deployment, snapshots 3 approvers, appends evidence', async () => {
  const f = await base();
  eq((await q('select status from public.paiflow_deployments where id=$1', [f.deploymentId])).rows[0].status, 'reserved', 'deployment reserved');
  eq((await q('select count(*)::int c from public.budget_approvals where version_id=$1', [f.versionId])).rows[0].c, 3, 'approver snapshot');
  eq(await planState(f), 'pending_approval', 'state');
  const ev = (await q("select count(*)::int c from public.transactions where plan_id=$1 and action_type='plan_create'", [f.planId])).rows[0].c;
  eq(ev, 1, 'one audit row');
  codeOf(await call('create_budget_plan', f.ids.owner, f.orgId, planInput(f)), 'NO_SPLIT_DEPLOYMENT', 'deployment already reserved');
});

test('create_budget_plan refusals: role, bps, duplicates, mismatch, tampered hash, approver set', async () => {
  const f = await base({ createPlan: false });
  codeOf(await call('create_budget_plan', f.ids.a1, f.orgId, planInput(f)), 'FORBIDDEN', 'approver cannot create');
  codeOf(await call('create_budget_plan', f.ids.outsider, f.orgId, planInput(f)), 'NOT_MEMBER', 'outsider');
  const bad = SPLIT.map((e, i) => (i === 0 ? { ...e, bps: 4000 } : e));
  codeOf(await call('create_budget_plan', f.ids.owner, f.orgId, planInput(f, { envelopes: bad })), 'BPS_TOTAL_INVALID', 'bps');
  const dup = SPLIT.map((e, i) => (i === 1 ? { ...e, recipientAddress: SPLIT[0].recipientAddress } : e));
  codeOf(await call('create_budget_plan', f.ids.owner, f.orgId, planInput(f, { envelopes: dup })), 'DUPLICATE_RECIPIENT', 'duplicate');
  const other = SPLIT.map((e, i) => (i === 2 ? { ...e, recipientAddress: addr('Z') } : e));
  codeOf(await call('create_budget_plan', f.ids.owner, f.orgId, planInput(f, { envelopes: other })), 'ENVELOPES_MISMATCH_DEPLOYMENT', 'mismatch');
  codeOf(await call('create_budget_plan', f.ids.owner, f.orgId, planInput(f, { planSha256: hex(5) })), 'VALIDATION', 'hash not matching text');
  codeOf(await call('create_budget_plan', f.ids.owner, f.orgId, planInput(f, { totalStroops: '0' })), 'VALIDATION', 'zero total');
  codeOf(await call('create_budget_plan', f.ids.owner, f.orgId, planInput(f, { signerUserId: f.ids.outsider })), 'NOT_MEMBER', 'signer must be a member');
  await q('delete from public.org_memberships where user_id in ($1,$2)', [f.ids.a1, f.ids.a2]);
  codeOf(await call('create_budget_plan', f.ids.owner, f.orgId, planInput(f)), 'APPROVER_SET_INVALID', 'owner-only approver set');
});

test('REQ-BUD-02 AC4: begin_payment_attempt is refused until EVERY approver approved (PLAN_NOT_APPROVED)', async () => {
  const f = await base();
  codeOf(await call('begin_payment_attempt', f.planId, f.ids.owner), 'PLAN_NOT_APPROVED', 'nobody approved');
  okOf(await approve(f, 'owner'), 'owner approves');
  okOf(await approve(f, 'a1'), 'a1 approves');
  codeOf(await call('begin_payment_attempt', f.planId, f.ids.owner), 'PLAN_NOT_APPROVED', 'one approver still pending');
  eq((await q('select count(*)::int c from public.payment_attempts where budget_plan_id=$1', [f.planId])).rows[0].c, 0, 'no attempt row created');
  codeOf(await call('begin_payment_attempt', f.planId, f.ids.member), 'NOT_SIGNER', 'member is not the signer');
  codeOf(await call('begin_payment_attempt', f.planId, f.ids.outsider), 'NOT_MEMBER', 'outsider');
});

test('approvals: last approval approves once; duplicate returns existing; stale, rejection, non-approver', async () => {
  const f = await base();
  const r1 = okOf(await approve(f, 'owner'), 'a'); eq([r1.state, r1.approved, r1.required], ['pending_approval', 1, 3], 'progress 1 of 3');
  const dup = okOf(await approve(f, 'owner'), 'dup'); eq(dup.outcome, 'existing', 'duplicate');
  codeOf(await approve(f, 'member'), 'FORBIDDEN', 'member is not in the approver snapshot');
  codeOf(await approve(f, 'a1', { sha: hex(9) }), 'STALE_VERSION', 'wrong hash');
  codeOf(await approve(f, 'a1', { versionId: randomUUID() }), 'STALE_VERSION', 'wrong version');
  okOf(await approve(f, 'a1'), 'a1');
  const last = okOf(await approve(f, 'a2'), 'a2'); eq(last.state, 'approved', 'approved after the last');
  eq((await q("select count(*)::int c from public.plan_state_transitions where plan_id=$1 and to_state='approved'", [f.planId])).rows[0].c, 1, 'approved exactly once');
});

test('rejection moves the plan to rejected and needs a reason', async () => {
  const f = await base();
  codeOf(await approve(f, 'a1', { decision: 'rejected' }), 'VALIDATION', 'reason required');
  const r = okOf(await approve(f, 'a1', { decision: 'rejected', reason: 'too high' }), 'reject');
  eq(r.state, 'rejected', 'state');
  codeOf(await approve(f, 'a2'), 'STATE_CONFLICT', 'cannot approve a rejected plan');
});

test('new version voids prior approvals, keeps the reservation, refuses changed envelopes and edits after payment', async () => {
  const f = await base();
  okOf(await approve(f, 'owner'), 'owner approves v1');
  const v = okOf(await call('create_plan_version', f.ids.owner, f.orgId, f.planId, planInput(f, { purpose: 'October budget v2' })), 'v2');
  eq(v.version, 2, 'version number');
  eq((await q('select count(*)::int c from public.budget_approvals where version_id=$1 and decision=$2', [v.versionId, 'pending'])).rows[0].c, 3, 'all pending again');
  codeOf(await approve(f, 'a1'), 'STALE_VERSION', 'old version is stale');
  const changed = SPLIT.map((e, i) => (i === 2 ? { ...e, recipientAddress: addr('Z') } : e));
  codeOf(await call('create_plan_version', f.ids.owner, f.orgId, f.planId, planInput(f, { envelopes: changed })), 'ENVELOPES_MISMATCH_DEPLOYMENT', 'changed envelopes refused');
  const f2 = await base();
  await approveAll(f2); await toPrepared(f2);
  codeOf(await call('create_plan_version', f2.ids.owner, f2.orgId, f2.planId, planInput(f2, { purpose: 'late edit' })), 'EDIT_AFTER_PAYMENT', 'edit after payment');
});

test('CL-11: two available deployments matching the same envelopes are ambiguous; none available is NO_SPLIT_DEPLOYMENT', async () => {
  const f = await base({ createPlan: false });
  const g = await base({ createPlan: false });
  codeOf(await call('create_budget_plan', f.ids.owner, f.orgId, planInput(f)), 'AMBIGUOUS_DEPLOYMENT_MATCH', 'two matches');
  await q("update public.paiflow_deployments set status='retired' where id in ($1,$2)", [f.deploymentId, g.deploymentId]);
  codeOf(await call('create_budget_plan', f.ids.owner, f.orgId, planInput(f)), 'NO_SPLIT_DEPLOYMENT', 'none available');
});

test('begin_payment_attempt: created, then existing on the second call; wallet mismatch refused', async () => {
  const f = await base(); await approveAll(f);
  await q('update public.wallet_bindings set revoked_at=now() where user_id=$1', [f.ids.owner]);
  codeOf(await call('begin_payment_attempt', f.planId, f.ids.owner), 'WALLET_MISMATCH', 'no active binding');
  await q("insert into public.wallet_bindings(user_id, address) values ($1,$2)", [f.ids.owner, addr('Y')]);
  codeOf(await call('begin_payment_attempt', f.planId, f.ids.owner), 'WALLET_MISMATCH', 'binding differs from plan signer address');
  await q('update public.wallet_bindings set revoked_at=now() where user_id=$1 and address=$2', [f.ids.owner, addr('Y')]);
  await q("insert into public.wallet_bindings(user_id, address) values ($1,$2)", [f.ids.owner, f.addrs.owner]);
  const a = okOf(await call('begin_payment_attempt', f.planId, f.ids.owner), 'begin');
  eq(a.outcome, 'created', 'created'); eq(a.attempt.state, 'preparing', 'preparing'); eq(a.attempt.amount_stroops, '10000000', 'amount from the plan');
  eq(a.context.envelopes.map((e) => e.expectedShareStroops), ['5000000', '3000000', '2000000'], 'DB-derived shares');
  const b = okOf(await call('begin_payment_attempt', f.planId, f.ids.owner), 'begin again');
  eq([b.outcome, b.attempt.id], ['existing', a.attempt.id], 'second call returns the same attempt');
  eq(await planState(f), 'payment_pending', 'plan state');
});

test('write-once evidence: XDR and hash cannot change; rows cannot be deleted; persist refuses a different body hash', async () => {
  const f = await base(); await approveAll(f);
  const id = await toPrepared(f);
  await sqlFails('update public.payment_attempts set prepared_xdr=$2 where id=$1', [id, 'other'], /write-once/, 'prepared_xdr');
  await sqlFails('update public.payment_attempts set original_tx_hash=$2 where id=$1', [id, hex(999)], /write-once/, 'original_tx_hash');
  codeOf(await call('persist_signed_envelope', id, f.ids.owner, 'SIGNED-XDR', hex(201), false), 'ENVELOPE_CHANGED', 'different body hash');
  codeOf(await call('persist_signed_envelope', id, f.ids.member, 'SIGNED-XDR', hex(200), false), 'NOT_SIGNER', 'only the signer');
  okOf(await call('persist_signed_envelope', id, f.ids.owner, 'SIGNED-XDR', hex(200), false), 'correct body');
  codeOf(await call('persist_signed_envelope', id, f.ids.owner, 'DIFFERENT-XDR', hex(200), false), 'ENVELOPE_CHANGED', 'signed envelope is never replaced');
  okOf(await call('persist_signed_envelope', id, f.ids.owner, 'SIGNED-XDR', hex(200), false), 'identical envelope is idempotent');
  await sqlFails('update public.payment_attempts set signed_xdr=$2 where id=$1', [id, 'x'], /write-once/, 'signed_xdr');
  await sqlFails('delete from public.payment_attempts where id=$1', [id], /cannot be deleted/, 'delete');
});

test('recordSubmission never moves the plan; not_found never unlocks a new prepare', async () => {
  const f = await base(); await approveAll(f);
  const id = await toSigned(f);
  const s = okOf(await call('record_submission', id, 'req1', { kind: 'response', status: 'PENDING', txHash: hex(200), ledger: null, errorCode: null }), 'submit');
  eq(s.state, 'submitted', 'attempt submitted'); eq(await planState(f), 'payment_pending', 'plan did not move');
  const t = okOf(await call('record_submission', id, 'req2', { kind: 'transport_error', httpStatus: null, code: 'TIMEOUT' }), 'transport');
  eq(t.state, 'submitted', 'lost response is still submitted, never failed');
  const c = okOf(await call('record_status_check', id, 'req3', false, { kind: 'not_found' }), 'check');
  eq(c.state, 'unknown', 'not_found -> unknown'); eq(await planState(f), 'payment_pending', 'plan did not move');
  const again = okOf(await call('begin_payment_attempt', f.planId, f.ids.owner), 'begin again');
  eq([again.outcome, again.attempt.id], ['existing', id], 'still the same open attempt: no replacement payment');
});

test('recordStatusCheck: SUCCESS confirms; FAILED returns the plan to approved and allows a deliberate new attempt', async () => {
  const f = await base(); await approveAll(f);
  const id = await toSigned(f);
  const ok = okOf(await call('record_status_check', id, 'r', false, found('SUCCESS')), 'success');
  eq([ok.state, ok.final_status], ['success', 'SUCCESS'], 'attempt'); eq(await planState(f), 'payment_confirmed', 'plan');
  const f2 = await base(); await approveAll(f2);
  const id2 = await toSigned(f2, hex(210));
  okOf(await call('record_status_check', id2, 'r', false, found('FAILED', hex(210))), 'failed');
  eq(await planState(f2), 'approved', 'plan back to approved');
  const n = okOf(await call('begin_payment_attempt', f2.planId, f2.ids.owner), 'new attempt after a confirmed FAILED');
  eq(n.outcome, 'created', 'deliberate new attempt'); assert(n.attempt.id !== id2, 'different attempt id');
});

test('recordStatusCheck: a lookup for a different hash or network escalates; exhausted checks go to operator review', async () => {
  const f = await base(); await approveAll(f);
  const id = await toSigned(f);
  const bad = okOf(await call('record_status_check', id, 'r', false, found('SUCCESS', hex(999))), 'wrong hash');
  eq(bad.state, 'operator_review', 'wrong hash escalates'); eq(await planState(f), 'operator_review', 'plan');
  eq((await q("select count(*)::int c from public.operator_reviews where ref_id=$1 and resolved_at is null", [id])).rows[0].c, 1, 'review opened');
  const f2 = await base(); await approveAll(f2);
  const id2 = await toSigned(f2, hex(220));
  okOf(await call('record_status_check', id2, 'r', false, found('PENDING', hex(220))), 'pending');
  const ex = okOf(await call('record_status_check', id2, 'r', true, found('PENDING', hex(220))), 'exhausted');
  eq(ex.state, 'operator_review', 'exhausted -> operator_review'); eq(await planState(f2), 'operator_review', 'plan');
});

test('markExpiredUnsigned: refused when a signed envelope exists; moves the plan to operator_review when really unsigned', async () => {
  const f = await base(); await approveAll(f);
  const id = await toSigned(f);
  codeOf(await call('mark_expired_unsigned', id), 'STATE_CONFLICT', 'signed envelope exists');
  const f2 = await base(); await approveAll(f2);
  const b = okOf(await call('begin_payment_attempt', f2.planId, f2.ids.owner), 'begin');
  const past = new Date(Date.now() - 60_000).toISOString();
  okOf(await call('record_preparation', b.attempt.id, 'testnet', 'p', 'XDR', hex(230), null, past, null), 'prep (already expired)');
  codeOf(await call('mark_signature_requested', b.attempt.id), 'STATE_CONFLICT', 'cannot request a signature after expiry');
  okOf(await call('mark_expired_unsigned', b.attempt.id), 'expire');
  eq(await planState(f2), 'operator_review', 'plan');
  eq((await attemptRow(b.attempt.id)).state, 'expired_unsigned', 'attempt');
});

test('failPreparation only while nothing was stored; it unlocks a retry', async () => {
  const f = await base(); await approveAll(f);
  const b = okOf(await call('begin_payment_attempt', f.planId, f.ids.owner), 'begin');
  okOf(await call('fail_preparation', b.attempt.id, 'PAIFLOW_503', 'req'), 'fail prep');
  eq(await planState(f), 'approved', 'plan back to approved');
  const f2 = await base(); await approveAll(f2);
  const id = await toPrepared(f2);
  codeOf(await call('fail_preparation', id, 'X', null), 'STATE_CONFLICT', 'XDR already stored: refused');
});

test('rule 8: distribution_verified only after ALL envelopes verify; a wrong amount or recipient is a mismatch', async () => {
  const f = await base(); await approveAll(f);
  const id = await toSigned(f);
  const early = okOf(await call('record_envelope_payout_verification', f.planId, id, 0, verif(f, 0)), 'before tx final');
  eq(early.state, 'awaiting_tx_final', 'cannot verify before the payment is confirmed');
  okOf(await call('record_status_check', id, 'r', false, found('SUCCESS')), 'success');
  const r0 = okOf(await call('record_envelope_payout_verification', f.planId, id, 0, verif(f, 0)), 'e0');
  const r1 = okOf(await call('record_envelope_payout_verification', f.planId, id, 1, verif(f, 1)), 'e1');
  eq([r0.verified, r1.verified, r1.planState], [1, 2, 'payment_confirmed'], '2 of 3 stays payment_confirmed');
  const r2 = okOf(await call('record_envelope_payout_verification', f.planId, id, 2, verif(f, 2)), 'e2');
  eq([r2.verified, r2.total, r2.planState], [3, 3, 'distribution_verified'], 'all verified');

  const g = await base(); await approveAll(g);
  const gid = await toSigned(g, hex(240));
  okOf(await call('record_status_check', gid, 'r', false, found('SUCCESS', hex(240))), 'success');
  const wrongAmt = okOf(await call('record_envelope_payout_verification', g.planId, gid, 0, verif(g, 0, { observedAmountStroops: '4999999' })), 'wrong amount');
  eq([wrongAmt.state, wrongAmt.planState], ['mismatch', 'mismatch'], 'amount mismatch');
  const h = await base(); await approveAll(h);
  const hid = await toSigned(h, hex(250));
  okOf(await call('record_status_check', hid, 'r', false, found('SUCCESS', hex(250))), 'success');
  const wrongRcp = okOf(await call('record_envelope_payout_verification', h.planId, hid, 1, verif(h, 1, { expectedAddress: addr('Q') })), 'wrong recipient');
  eq(wrongRcp.state, 'mismatch', 'recipient mismatch');
});

test('the ledger and audit chain: hashes are recomputable from stored inputs and the chain does not fork', async () => {
  const f = await base(); await approveAll(f);
  const rows = (await q('select hash, previous_hash, hash_input from public.blockchain where hash_input is not null order by id')).rows;
  assert(rows.length >= 4, 'blocks written');
  for (const r of rows) eq(sha(r.hash_input), r.hash, 'block hash recomputes from hash_input');
  for (let i = 1; i < rows.length; i++) eq(rows[i].previous_hash, rows[i - 1].hash, 'block links to the previous block');
  const tx = (await q('select tx_hash, hash_input from public.transactions where plan_id=$1 order by created_at, id', [f.planId])).rows;
  assert(tx.length >= 4, 'audit rows written');
  for (const t of tx) assert(t.hash_input && t.tx_hash, 'audit hash_input is stored');
  const recomputed = (await q('select tx_hash = encode(sha256(convert_to(hash_input::text, $2)), $3) ok from public.transactions where plan_id=$1', [f.planId, 'UTF8', 'hex'])).rows;
  assert(recomputed.every((r) => r.ok), 'audit hash recomputes from stored hash_input');
});

test('documents: member can record; outsider and bad input are refused; ledger row is written in the same transaction', async () => {
  const f = await base({ createPlan: false });
  const key = `orgs/${f.orgId}/docs/${randomUUID()}`;
  const d = okOf(await call('record_org_document', f.ids.member, f.orgId, 'contract', hex(400), 1024, 'application/pdf', key, 'c.pdf'), 'record');
  assert(d.ledgerBlockId, 'ledger block id');
  eq((await q("select count(*)::int c from public.transactions where org_id=$1 and action_type='doc_record'", [f.orgId])).rows[0].c, 1, 'audit row');
  codeOf(await call('record_org_document', f.ids.outsider, f.orgId, 'contract', hex(400), 1, 'application/pdf', `orgs/${f.orgId}/docs/${randomUUID()}`, 'c.pdf'), 'NOT_MEMBER', 'outsider');
  codeOf(await call('record_org_document', f.ids.member, f.orgId, 'contract', 'nothex', 1, 'application/pdf', `orgs/${f.orgId}/docs/${randomUUID()}`, 'c.pdf'), 'VALIDATION', 'bad hash');
  codeOf(await call('record_org_document', f.ids.member, f.orgId, 'contract', hex(401), 20_000_000, 'application/pdf', `orgs/${f.orgId}/docs/${randomUUID()}`, 'c.pdf'), 'VALIDATION', 'too large');
});

test('wallet binding: replayed challenge refused, other address refused, address already bound, unbind locked while signer', async () => {
  const f = await base({ createPlan: false });
  const u = randomUUID();
  await q("insert into auth.users(id, aud, role, email) values ($1,'authenticated','authenticated',$2)", [u, `w-${u}@example.test`]);
  const c = okOf(await call('issue_wallet_challenge', u, addr('M'), 'http://localhost:3000', 300), 'challenge');
  codeOf(await call('consume_challenge_and_bind', u, c.challengeId, addr('N')), 'CHALLENGE_INVALID', 'other address');
  codeOf(await call('consume_challenge_and_bind', f.ids.owner, c.challengeId, addr('M')), 'CHALLENGE_INVALID', 'other user');
  okOf(await call('consume_challenge_and_bind', u, c.challengeId, addr('M')), 'bind');
  codeOf(await call('consume_challenge_and_bind', u, c.challengeId, addr('M')), 'CHALLENGE_INVALID', 'replay');
  const c2 = okOf(await call('issue_wallet_challenge', f.ids.operator, f.addrs.owner, 'http://localhost:3000', 300), 'challenge 2');
  codeOf(await call('consume_challenge_and_bind', f.ids.operator, c2.challengeId, f.addrs.owner), 'ADDRESS_ALREADY_BOUND', 'address of another user');
  await q("update public.wallet_challenges set expires_at = now() - interval '1 second' where id=$1", [c2.challengeId]);
  codeOf(await call('get_wallet_challenge', f.ids.operator, c2.challengeId), 'CHALLENGE_INVALID', 'expired');
  await q("update public.paiflow_deployments set status='unusable' where id=$1", [f.deploymentId]);
  const g = await base();
  codeOf(await call('unbind_wallet', g.ids.owner), 'BINDING_LOCKED', 'signer of an open plan');
  okOf(await call('unbind_wallet', g.ids.member), 'unbind a member who is not a signer');
});

test('RLS and grants: anon and authenticated cannot read financial rows or call the RPCs', async () => {
  const f = await base(); await approveAll(f);
  const id = await toPrepared(f);
  for (const role of ['anon', 'authenticated']) {
    await q(`set local role ${role}`);
    for (const t of ['payment_attempts', 'wallet_challenges', 'operator_reviews', 'paiflow_events', 'payout_verifications']) {
      await sqlFails(`select * from public.${t}`, [], /permission denied/, `${role} select ${t}`);
    }
    await sqlFails('select public.begin_payment_attempt($1,$2)', [f.planId, f.ids.owner], /permission denied/, `${role} rpc`);
    await q('reset role');
  }
  await q('set local role anon');
  await sqlFails('select * from public.budget_plans', [], /permission denied/, 'anon plans');
  await q('reset role');
  void id;
});

// ---------- runner ----------
let failed = 0;
for (const t of tests) {
  await q('begin');
  const t0 = Date.now();
  try { await t.fn(); console.log(`PASS  ${t.name} (${Date.now() - t0} ms)`); }
  catch (e) { failed++; console.log(`FAIL  ${t.name}\n      ${e.message}`); }
  finally { await q('rollback').catch(() => {}); }
}
const leftover = (await q("select (select count(*) from public.budget_plans)::int p, (select count(*) from public.organisations)::int o")).rows[0];
console.log(`\n${tests.length - failed}/${tests.length} passed. Leftover rows after rollback: plans=${leftover.p} orgs=${leftover.o} (expect 0)`);
await db.end();
process.exit(failed ? 1 : 0);
