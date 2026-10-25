// Level: DB (cyfai-sme-dev). F-16 / G7: concurrent last approvals publish exactly once (REQ-BUD-02 AC1).
// Unlike the other DB tests this one COMMITS (parallel sessions cannot see each other's uncommitted work), so it builds
// its own isolated fixture and removes every row it created in a finally block. It refuses to run if cleanup could touch
// ledger blocks that are not the newest ones. Usage: node tests/db/approval-concurrency.db.mjs <dir-with-pg>
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const { Client } = createRequire(join(resolve(process.argv[2]), 'package.json'))('pg');
const env = Object.fromEntries(readFileSync(join(import.meta.dirname, '..', '..', '.env.local'), 'utf8').split(/\r?\n/)
  .filter((l) => l && !l.startsWith('#') && l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim()]; }));
const connect = async () => { const c = new Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } }); await c.connect(); return c; };

const addr = (c, n = 0) => `G${c.repeat(52)}${String.fromCharCode(65 + (n % 26))}${String.fromCharCode(66 + Math.floor(n / 26) % 25)}2`;
const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
const canonical = (v) => (v === null || typeof v !== 'object' ? JSON.stringify(v) : Array.isArray(v) ? `[${v.map(canonical).join(',')}]`
  : `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`);
const assert = (c, m) => { if (!c) throw new Error(`assertion failed: ${m}`); };

const admin = await connect();
const tag = randomUUID().slice(0, 8);
const ids = Object.fromEntries(['owner', 'a1', 'a2'].map((k) => [k, randomUUID()]));
const org = randomUUID(), dep = randomUUID();
let planId = null;
const SPLIT = [{ position: 0, label: 'Ops', bps: 5000, recipientAddress: addr('A', 7) }, { position: 1, label: 'Pay', bps: 3000, recipientAddress: addr('B', 7) }, { position: 2, label: 'Sup', bps: 2000, recipientAddress: addr('C', 7) }];
let failed = false;
const workers = [];

async function cleanup() {
  const q = (s, p) => admin.query(s, p);
  const blocks = (await q("select distinct (hash_input->>'ledgerBlockId')::int id from public.transactions where org_id=$1 and hash_input ? 'ledgerBlockId'", [org])).rows.map((r) => r.id);
  const maxChain = (await q('select coalesce(max(id),0)::int m from public.blockchain')).rows[0].m;
  const newest = blocks.length === 0 || Math.min(...blocks) > (await q('select coalesce(max(id),0)::int m from public.blockchain where id <> all($1)', [blocks])).rows[0].m;
  await q('begin');
  try {
    await q('delete from public.transactions where org_id=$1', [org]);
    if (newest) await q('delete from public.blockchain where id = any($1)', [blocks]);
    else console.log(`WARNING: ledger blocks ${blocks} are not the newest (max ${maxChain}); left in place`);
    await q('delete from public.budget_approvals where version_id in (select id from public.budget_plan_versions where plan_id=$1)', [planId]);
    await q('delete from public.budget_envelopes where version_id in (select id from public.budget_plan_versions where plan_id=$1)', [planId]);
    await q('delete from public.plan_state_transitions where plan_id=$1', [planId]);
    await q('update public.budget_plans set current_version_id=null where id=$1', [planId]);
    await q('delete from public.deployment_reservations where deployment_id=$1', [dep]);
    await q('delete from public.budget_plan_versions where plan_id=$1', [planId]);
    await q('delete from public.budget_plans where id=$1', [planId]);
    await q('delete from public.paiflow_deployments where id=$1', [dep]);
    await q('delete from public.wallet_bindings where user_id = any($1)', [Object.values(ids)]);
    await q('delete from public.org_memberships where org_id=$1', [org]);
    await q('delete from public.organisations where id=$1', [org]);
    await q('delete from public.profiles where user_id = any($1)', [Object.values(ids)]);
    await q('delete from auth.users where id = any($1)', [Object.values(ids)]);
    await q('commit');
    console.log('cleanup: all fixture rows removed');
  } catch (e) { await q('rollback').catch(() => {}); console.log(`CLEANUP FAILED (fixture tag ${tag}, org ${org}): ${e.message}`); failed = true; }
}

try {
  // ---- fixture (committed) ----
  await admin.query('begin');
  for (const [k, id] of Object.entries(ids)) {
    await admin.query("insert into auth.users(id, aud, role, email) values ($1,'authenticated','authenticated',$2)", [id, `conc-${tag}-${k}@example.test`]);
    await admin.query('insert into public.profiles(user_id, display_name) values ($1,$2)', [id, `conc-${k}`]);
  }
  await admin.query('insert into public.organisations(id, name) values ($1,$2)', [org, `concurrency-${tag}`]);
  const roles = { owner: 'owner', a1: 'approver', a2: 'approver' };
  for (const [k, id] of Object.entries(ids)) {
    await admin.query('insert into public.org_memberships(org_id,user_id,role) values ($1,$2,$3)', [org, id, roles[k]]);
    await admin.query('insert into public.wallet_bindings(user_id,address) values ($1,$2)', [id, addr('S', 40 + Object.keys(ids).indexOf(k))]);
  }
  await admin.query("insert into public.paiflow_deployments(id,template,split_recipients,graph_snapshot_sha256,status) values ($1,'budget_split',$2::jsonb,$3,'available')",
    [dep, JSON.stringify(SPLIT.map((e) => ({ position: e.position, address: e.recipientAddress, bps: e.bps, label: e.label }))), '0'.repeat(63) + '1']);
  const ownerAddr = (await admin.query('select address from public.wallet_bindings where user_id=$1', [ids.owner])).rows[0].address;
  const envelopes = SPLIT.map((e) => ({ ...e, planningPhpCentavos: null }));
  const text = canonical({ asset: { kind: 'native' }, deploymentId: dep, envelopes, purpose: 'concurrency', signerAddress: ownerAddr, totalStroops: '10000000' });
  const input = { purpose: 'concurrency', totalStroops: '10000000', signerUserId: ids.owner, envelopes, canonicalText: text, planSha256: sha(text) };
  await admin.query('commit');
  const created = (await admin.query('select public.create_budget_plan($1,$2,$3::jsonb) r', [ids.owner, org, input])).rows[0].r;
  assert(created.ok, `create plan: ${JSON.stringify(created)}`);
  planId = created.value.planId;
  const versionId = created.value.versionId;

  // ---- race: the three last approvals plus a duplicate of the owner's, all at once on separate sessions ----
  const attempts = [['owner', 'approved'], ['a1', 'approved'], ['a2', 'approved'], ['owner', 'approved']];
  for (let i = 0; i < attempts.length; i++) workers.push(await connect());
  const results = await Promise.all(attempts.map(async ([who], i) =>
    (await workers[i].query('select public.decide_budget_plan($1,$2,$3,$4,$5,null) r', [ids[who], planId, versionId, input.planSha256, 'approved'])).rows[0].r));

  console.log('results:', results.map((r) => (r.ok ? `${r.value.outcome}/${r.value.state}/${r.value.approved}of${r.value.required}` : r.code)).join('  '));
  assert(results.every((r) => r.ok), 'every concurrent call succeeds (no deadlock, no spurious error)');
  const state = (await admin.query('select state from public.budget_plans where id=$1', [planId])).rows[0].state;
  assert(state === 'approved', `plan ends approved (got ${state})`);
  const transitions = (await admin.query("select count(*)::int c from public.plan_state_transitions where plan_id=$1 and to_state='approved'", [planId])).rows[0].c;
  assert(transitions === 1, `approved exactly once (got ${transitions})`);
  const published = (await admin.query("select count(*)::int c from public.transactions where plan_id=$1 and action_type='plan_approve' and (hash_input->'payload'->>'fullyApproved')::boolean", [planId])).rows[0].c;
  assert(published === 1, `exactly one audit row says fullyApproved (got ${published})`);
  const decided = (await admin.query("select count(*)::int c from public.budget_approvals where version_id=$1 and decision='approved'", [versionId])).rows[0].c;
  assert(decided === 3, `three approvals recorded (got ${decided})`);
  const dupes = results.filter((r) => r.value.outcome === 'existing').length;
  assert(dupes === 1, `the duplicate returned the existing decision (got ${dupes})`);
  const chain = (await admin.query("select count(*)::int c from public.transactions where plan_id=$1 and action_type='plan_approve'", [planId])).rows[0].c;
  assert(chain === 3, `one audit row per recorded approval, none for the duplicate (got ${chain})`);
  const links = (await admin.query('select id, previous_hash, hash from public.blockchain order by id')).rows;
  for (let i = 1; i < links.length; i++) assert(links[i].previous_hash === links[i - 1].hash, 'ledger chain did not fork under concurrency');
  console.log('PASS  concurrent last approvals: published once, no fork, duplicate returned the existing decision');
} catch (e) {
  failed = true;
  console.log(`FAIL  ${e.message}`);
} finally {
  await Promise.all(workers.map((w) => w.end().catch(() => {})));
  if (planId) await cleanup(); else { await admin.query('rollback').catch(() => {}); }
  await admin.end();
}
process.exit(failed ? 1 : 0);
