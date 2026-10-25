// Level: DB (cyfai-sme-dev). G7 criterion 6: (A) concurrent payment starts create ONE attempt; (B) concurrent plan
// creations racing for ONE deployment have ONE winner. Real parallel sessions, so the fixtures are COMMITTED and removed
// in a finally block. payment_attempts refuses deletes by trigger, so cleanup disables that one trigger INSIDE a
// transaction (the ALTER holds an exclusive table lock, so no other session sees a window), deletes only this test's own
// rows, and re-enables it before commit; the script then verifies the trigger is enabled again.
// Usage: node tests/db/concurrency-guards.db.mjs <dir-with-pg>
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const { Client } = createRequire(join(resolve(process.argv[2]), 'package.json'))('pg');
const env = Object.fromEntries(readFileSync(join(import.meta.dirname, '..', '..', '.env.local'), 'utf8').split(/\r?\n/)
  .filter((l) => l && !l.startsWith('#') && l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim()]; }));
const connect = async () => { const c = new Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } }); await c.connect(); return c; };
const uniq = (c, n) => `G${c.repeat(52)}${String.fromCharCode(65 + (n % 26))}${String.fromCharCode(65 + Math.floor(n / 26) % 26)}2`;
const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
const canonical = (v) => (v === null || typeof v !== 'object' ? JSON.stringify(v) : Array.isArray(v) ? `[${v.map(canonical).join(',')}]`
  : `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`);
const assert = (c, m) => { if (!c) throw new Error(`assertion failed: ${m}`); };

const admin = await connect();
const tag = randomUUID().slice(0, 8);
const SPLIT = [{ position: 0, label: 'Ops', bps: 5000, recipientAddress: uniq('A', 11) }, { position: 1, label: 'Pay', bps: 3000, recipientAddress: uniq('B', 11) }, { position: 2, label: 'Sup', bps: 2000, recipientAddress: uniq('C', 11) }];
const worlds = [];
let dep = null;
const deps = []; // every deployment this test registers
let failed = false;
const sessions = [];

async function createWorld(label, n) {
  const w = { label, org: randomUUID(), ids: { owner: randomUUID(), a1: randomUUID(), a2: randomUUID() }, planId: null, versionId: null, addrs: {} };
  await admin.query('begin');
  for (const [k, id] of Object.entries(w.ids)) {
    await admin.query("insert into auth.users(id, aud, role, email) values ($1,'authenticated','authenticated',$2)", [id, `cg-${tag}-${label}-${k}@example.test`]);
    await admin.query('insert into public.profiles(user_id, display_name) values ($1,$2)', [id, `cg-${label}-${k}`]);
  }
  await admin.query('insert into public.organisations(id, name) values ($1,$2)', [w.org, `cg-${tag}-${label}`]);
  let i = 0;
  for (const [k, role] of [['owner', 'owner'], ['a1', 'approver'], ['a2', 'approver']]) {
    w.addrs[k] = uniq('S', n * 3 + i++);
    await admin.query('insert into public.org_memberships(org_id,user_id,role) values ($1,$2,$3)', [w.org, w.ids[k], role]);
    await admin.query('insert into public.wallet_bindings(user_id,address) values ($1,$2)', [w.ids[k], w.addrs[k]]);
  }
  await admin.query('commit');
  worlds.push(w);
  return w;
}

function planInput(w) {
  const envelopes = SPLIT.map((e) => ({ ...e, planningPhpCentavos: null }));
  const text = canonical({ asset: { kind: 'native' }, deploymentId: dep, envelopes, purpose: `cg-${w.label}`, signerAddress: w.addrs.owner, totalStroops: '10000000' });
  return { purpose: `cg-${w.label}`, totalStroops: '10000000', signerUserId: w.ids.owner, envelopes, canonicalText: text, planSha256: sha(text) };
}

async function cleanup() {
  const q = (s, p) => admin.query(s, p);
  const orgs = worlds.map((w) => w.org);
  const users = worlds.flatMap((w) => Object.values(w.ids));
  const plans = (await q('select id from public.budget_plans where org_id = any($1)', [orgs])).rows.map((r) => r.id);
  const blocks = (await q("select distinct (hash_input->>'ledgerBlockId')::int id from public.transactions where org_id = any($1) and hash_input ? 'ledgerBlockId'", [orgs])).rows.map((r) => r.id);
  const others = blocks.length ? (await q('select coalesce(max(id),0)::int m from public.blockchain where id <> all($1)', [blocks])).rows[0].m : 0;
  const newest = blocks.length === 0 || Math.min(...blocks) > others;
  await q('begin');
  try {
    await q('alter table public.payment_attempts disable trigger payment_attempts_no_delete_trg');
    await q('delete from public.payment_attempts where budget_plan_id = any($1)', [plans]);
    await q('alter table public.payment_attempts enable trigger payment_attempts_no_delete_trg');
    await q('delete from public.transactions where org_id = any($1)', [orgs]);
    if (newest) await q('delete from public.blockchain where id = any($1)', [blocks]); else console.log(`WARNING: ledger blocks ${blocks} are not the newest; left in place`);
    const vers = '(select id from public.budget_plan_versions where plan_id = any($1))';
    await q(`delete from public.budget_approvals where version_id in ${vers}`, [plans]);
    await q(`delete from public.budget_envelopes where version_id in ${vers}`, [plans]);
    await q('delete from public.plan_state_transitions where plan_id = any($1)', [plans]);
    await q('update public.budget_plans set current_version_id=null where id = any($1)', [plans]);
    await q('delete from public.deployment_reservations where budget_plan_id = any($1) or deployment_id = any($2)', [plans, deps]);
    await q('delete from public.budget_plan_versions where plan_id = any($1)', [plans]);
    await q('delete from public.budget_plans where id = any($1)', [plans]);
    await q('delete from public.paiflow_deployments where id = any($1)', [deps]);
    await q('delete from public.wallet_bindings where user_id = any($1)', [users]);
    await q('delete from public.org_memberships where org_id = any($1)', [orgs]);
    await q('delete from public.organisations where id = any($1)', [orgs]);
    await q('delete from public.profiles where user_id = any($1)', [users]);
    await q('delete from auth.users where id = any($1)', [users]);
    await q('commit');
    const trg = (await q("select tgenabled from pg_trigger where tgname='payment_attempts_no_delete_trg'")).rows[0].tgenabled;
    assert(trg === 'O', `delete-blocking trigger is enabled again (tgenabled=${trg})`);
    console.log('cleanup: all fixture rows removed; payment_attempts delete guard re-enabled');
  } catch (e) { await q('rollback').catch(() => {}); console.log(`CLEANUP FAILED (tag ${tag}): ${e.message}`); failed = true; }
}

const open = async (n) => { const out = []; for (let i = 0; i < n; i++) { const c = await connect(); sessions.push(c); out.push(c); } return out; };
const rpc = async (c, fn, ...a) => (await c.query(`select public.${fn}(${a.map((_, i) => `$${i + 1}`).join(',')}) r`, a)).rows[0].r;

try {
  // ============ (A) concurrent payment starts ============
  dep = randomUUID(); deps.push(dep);
  await admin.query("insert into public.paiflow_deployments(id,template,split_recipients,graph_snapshot_sha256,status) values ($1,'budget_split',$2::jsonb,$3,'available')",
    [dep, JSON.stringify(SPLIT.map((e) => ({ position: e.position, address: e.recipientAddress, bps: e.bps, label: e.label }))), '0'.repeat(63) + '2']);
  const w1 = await createWorld('a', 1);
  const created = await rpc(admin, 'create_budget_plan', w1.ids.owner, w1.org, planInput(w1));
  assert(created.ok, `create plan: ${JSON.stringify(created)}`);
  w1.planId = created.value.planId; w1.versionId = created.value.versionId;
  for (const who of ['owner', 'a1', 'a2']) {
    const r = await rpc(admin, 'decide_budget_plan', w1.ids[who], w1.planId, w1.versionId, created.value.planSha256, 'approved', null);
    assert(r.ok, `approve ${who}`);
  }
  const cs = await open(5);
  const results = await Promise.all(cs.map((c) => rpc(c, 'begin_payment_attempt', w1.planId, w1.ids.owner)));
  console.log('(A) results:', results.map((r) => (r.ok ? r.value.outcome : r.code)).join(' '));
  assert(results.every((r) => r.ok), '(A) every concurrent call succeeds (no deadlock, no spurious error)');
  const createdCount = results.filter((r) => r.value.outcome === 'created').length;
  assert(createdCount === 1, `(A) exactly one call created the attempt (got ${createdCount})`);
  assert(new Set(results.map((r) => r.value.attempt.id)).size === 1, '(A) every call returned the same attempt');
  const rows = (await admin.query('select count(*)::int c from public.payment_attempts where budget_plan_id=$1', [w1.planId])).rows[0].c;
  assert(rows === 1, `(A) one attempt row (got ${rows})`);
  assert((await admin.query('select state from public.budget_plans where id=$1', [w1.planId])).rows[0].state === 'payment_pending', '(A) plan is payment_pending');
  console.log('PASS  (A) concurrent payment starts: one attempt, everyone else got the same one');

  // ============ (B) two orgs race for ONE deployment ============
  // world a's deployment is already reserved, so register a fresh shared one for the race.
  const dep2 = randomUUID(); deps.push(dep2);
  await admin.query("insert into public.paiflow_deployments(id,template,split_recipients,graph_snapshot_sha256,status) values ($1,'budget_split',$2::jsonb,$3,'available')",
    [dep2, JSON.stringify(SPLIT.map((e) => ({ position: e.position, address: e.recipientAddress, bps: e.bps, label: e.label }))), '0'.repeat(63) + '3']);
  const wb = await createWorld('b', 2), wc = await createWorld('c', 3);
  const saved = dep; dep = dep2;
  const inputs = [planInput(wb), planInput(wc)];
  dep = saved;
  const racers = await open(2);
  const outcome = await Promise.all([
    rpc(racers[0], 'create_budget_plan', wb.ids.owner, wb.org, inputs[0]),
    rpc(racers[1], 'create_budget_plan', wc.ids.owner, wc.org, inputs[1]),
  ]);
  console.log('(B) results:', outcome.map((r) => (r.ok ? 'ok' : r.code)).join(' '));
  const winners = outcome.filter((r) => r.ok).length;
  const active = (await admin.query('select count(*)::int c from public.deployment_reservations where deployment_id=$1 and active', [dep2])).rows[0].c;
  assert(winners === 1, `(B) exactly one plan wins the deployment (got ${winners})`);
  assert(active === 1, `(B) exactly one active reservation (got ${active})`);
  const loser = outcome.find((r) => !r.ok);
  assert(['NO_SPLIT_DEPLOYMENT', 'STATE_CONFLICT', 'AMBIGUOUS_DEPLOYMENT_MATCH'].includes(loser.code), `(B) the loser gets a deployment-availability refusal, not an unrelated code (got ${loser.code})`);
  console.log('PASS  (B) concurrent reservations: one winner, one active reservation, clear refusal for the loser');
} catch (e) {
  failed = true;
  console.log(`FAIL  ${e.message}`);
} finally {
  await Promise.all(sessions.map((s) => s.end().catch(() => {})));
  if (worlds.length) await cleanup();
  else if (deps.length) await admin.query('delete from public.paiflow_deployments where id = any($1)', [deps]).catch(() => {});
  const left = (await admin.query("select (select count(*) from public.paiflow_deployments)::int d, (select count(*) from public.budget_plans)::int p, (select count(*) from public.payment_attempts)::int a, (select count(*) from public.organisations)::int o").catch(() => ({ rows: [{}] }))).rows[0];
  console.log(`leftovers: deployments=${left.d} plans=${left.p} attempts=${left.a} orgs=${left.o} (expect 0 0 0 and 1 for the Demo SME org)`);
  await admin.end();
}
process.exit(failed ? 1 : 0);
