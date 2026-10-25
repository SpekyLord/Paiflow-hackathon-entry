// F-18: provision the demo accounts, organisation, memberships and operator flag on the DEDICATED project.
// Reads Supabase URL, service-role key and the four DEMO_*_PASSWORD values from .env.local. Prints no secret.
// Idempotent: existing users/rows are kept. Usage: node supabase/apply/provision-demo-accounts.mjs
//
// Role mapping (B-13, CL-14): owner = authorised signer; approver1 and approver2 = approvers; operator = profile flag only,
// NOT an org member. No inherited users-table admin role is created or used.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync(join(import.meta.dirname, '..', '..', '.env.local'), 'utf8').split(/\r?\n/)
  .filter((l) => l && !l.startsWith('#') && l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim()]; }));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!/^https:\/\/ycptnrpuljnuomxqrsqn\.supabase\.co\/?$/.test(url)) { console.error('Refusing: not the dedicated project cyfai-sme-dev.'); process.exit(1); }

const ACCOUNTS = [
  { key: 'owner', email: 'owner@cyfer-demo.test', name: 'Demo Owner', pw: env.DEMO_OWNER_PASSWORD, org: 'owner', operator: false },
  { key: 'approver1', email: 'approver1@cyfer-demo.test', name: 'Demo Approver 1', pw: env.DEMO_APPROVER1_PASSWORD, org: 'approver', operator: false },
  { key: 'approver2', email: 'approver2@cyfer-demo.test', name: 'Demo Approver 2', pw: env.DEMO_APPROVER2_PASSWORD, org: 'approver', operator: false },
  { key: 'operator', email: 'operator@cyfer-demo.test', name: 'Demo Operator', pw: env.DEMO_OPERATOR_PASSWORD, org: null, operator: true },
];
const pws = ACCOUNTS.map((a) => a.pw);
if (pws.some((p) => !p || p.length < 12)) { console.error('Each DEMO_*_PASSWORD must be set and at least 12 characters.'); process.exit(1); }
if (new Set(pws).size !== pws.length) { console.error('The four passwords must all be different.'); process.exit(1); }

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const fail = (what, e) => { console.error(`FAILED: ${what}: ${e?.message ?? e}`); process.exit(2); };

const existing = new Map();
for (let page = 1; page < 20; page++) {
  const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
  if (error) fail('list users', error);
  for (const u of data.users) existing.set(u.email, u.id);
  if (data.users.length < 200) break;
}

const ids = {};
for (const a of ACCOUNTS) {
  if (existing.has(a.email)) { ids[a.key] = existing.get(a.email); console.log(`kept    ${a.email}`); continue; }
  const { data, error } = await sb.auth.admin.createUser({ email: a.email, password: a.pw, email_confirm: true });
  if (error) fail(`create ${a.email}`, error);
  ids[a.key] = data.user.id;
  console.log(`created ${a.email}`);
}

for (const a of ACCOUNTS) {
  const { error } = await sb.from('profiles').upsert({ user_id: ids[a.key], display_name: a.name, is_operator: a.operator }, { onConflict: 'user_id' });
  if (error) fail(`profile ${a.key}`, error);
}

let orgId;
{
  const { data, error } = await sb.from('organisations').select('id').eq('name', 'Demo SME').limit(1);
  if (error) fail('read organisation', error);
  if (data.length) orgId = data[0].id;
  else {
    const ins = await sb.from('organisations').insert({ name: 'Demo SME' }).select('id').single();
    if (ins.error) fail('create organisation', ins.error);
    orgId = ins.data.id;
  }
}
for (const a of ACCOUNTS.filter((x) => x.org)) {
  const { error } = await sb.from('org_memberships').upsert({ org_id: orgId, user_id: ids[a.key], role: a.org }, { onConflict: 'org_id,user_id' });
  if (error) fail(`membership ${a.key}`, error);
}

// Verify, without printing secrets.
const ops = await sb.from('profiles').select('user_id').eq('is_operator', true);
const mem = await sb.from('org_memberships').select('role, user_id').eq('org_id', orgId);
if (ops.error || mem.error) fail('verify', ops.error ?? mem.error);
console.log(`\noperators: ${ops.data.length} (expect 1; the operator is not an org member: ${!mem.data.some((m) => m.user_id === ids.operator)})`);
console.log(`memberships: ${mem.data.map((m) => m.role).sort().join(', ')} (expect approver, approver, owner)`);
console.log(`organisation id: ${orgId}`);
