// Level: LOCAL LIVE. Probes Carlos's routes on a running local server (`npm run dev`) backed by the dedicated test
// Supabase project, signing in as the F-18 demo accounts. Not part of `npm test`. It never sends a Testnet
// transaction, and without PAIFLOW_API_TOKEN no request can reach Paiflow. Only localhost is allowed.
// Usage: node tests/live/payments-smoke.live.mjs [http://localhost:3000]
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:3000';
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) throw new Error('Smoke test runs against localhost only.');
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .filter((l) => l && !l.startsWith('#') && l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]));
// Values that must never appear in any response.
const SECRETS = [env.SUPABASE_SERVICE_ROLE_KEY, env.SUPABASE_DB_URL, env.DEMO_OWNER_PASSWORD, env.DEMO_OPERATOR_PASSWORD].filter(Boolean);

const results = [];
const bodies = [];
const check = (name, ok, detail = '') => results.push({ name, ok: Boolean(ok), detail });

async function call(method, path, { cookie, body, origin = BASE, raw } = {}) {
  const headers = { accept: 'application/json' };
  if (method !== 'GET') Object.assign(headers, { origin, 'content-type': 'application/json' });
  if (cookie) headers.cookie = cookie;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: method === 'GET' ? undefined : raw ?? JSON.stringify(body ?? {}) });
  const text = await res.text();
  bodies.push(text);
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status, json, cookies: res.headers.getSetCookie?.() ?? [] };
}

async function signIn(email, password) {
  const res = await call('POST', '/api/auth/sign-in', { body: { email, password } });
  const cookie = res.cookies.map((c) => c.split(';')[0]).join('; ');
  return { res, cookie };
}

const org = randomUUID();
const plan = randomUUID();
const attempt = randomUUID();
const planPath = (o = org, p = plan) => `/api/orgs/${o}/budget-plans/${p}`;
const MUTATIONS = [
  ['pay/prepare', (o, p) => `${planPath(o, p)}/pay/prepare`, {}],
  ['pay/submit', (o, p) => `${planPath(o, p)}/pay/submit`, { attemptId: attempt, signedXdr: 'AAAA' }],
  ['pay/check', (o, p) => `${planPath(o, p)}/pay/check`, { attemptId: attempt }],
  ['pay/resubmit', (o, p) => `${planPath(o, p)}/pay/resubmit`, { attemptId: attempt, originalTxHash: 'a'.repeat(64), intent: 'resubmit_same_signed_envelope' }],
  ['evidence/refresh', (o, p) => `${planPath(o, p)}/evidence/refresh`, {}],
  ['operator/deployments POST', () => '/api/operator/deployments', {}],
  ['operator/reviews/:id POST', () => `/api/operator/reviews/${randomUUID()}`, { outcome: 'no_action', justification: 'x', evidence: { notes: '' } }],
];

// 1. Integration status: no secrets, Paiflow not configured on this machine.
const status = await call('GET', '/api/integration/status');
check('integration status reports configuration only', status.status === 200 && status.json?.data?.paiflowConfigured === false && status.json?.data?.network === null, JSON.stringify(status.json));

// 2. Without a session every Carlos route is 401.
for (const path of ['/api/wallet/summary', '/api/operator/deployments', '/api/operator/reviews'])
  check(`401 without session: GET ${path}`, (await call('GET', path)).status === 401);
for (const [name, path, body] of MUTATIONS)
  check(`401 without session: ${name}`, (await call('POST', path(org, plan), { body })).status === 401);

// 3. Owner.
const owner = await signIn('owner@cyfer-demo.test', env.DEMO_OWNER_PASSWORD);
check('owner signs in', owner.res.status === 200 && owner.cookie.length > 0, `status ${owner.res.status}`);
const me = await call('GET', '/api/auth/me', { cookie: owner.cookie });
const ownerOrg = me.json?.data?.orgs?.[0]?.orgId;
check('owner session has an org', Boolean(ownerOrg));

const wallet = await call('GET', '/api/wallet/summary', { cookie: owner.cookie });
const balance = wallet.json?.data?.balance;
check('wallet summary 200 for owner', wallet.status === 200, JSON.stringify(wallet.json?.error ?? ''));
check('wallet balance is available or unavailable, never a fake 0',
  balance?.state === 'unavailable' ? !('xlmStroops' in balance) : balance?.state === 'available' && /^\d+$/.test(balance.xlmStroops), JSON.stringify(balance));
check('wallet history holds only Stellar hashes', (wallet.json?.data?.history ?? []).every((h) => /^[a-f0-9]{64}$/.test(h.stellarTxHash)));
check('wallet escrow empty in MVP', Array.isArray(wallet.json?.data?.escrow) && wallet.json.data.escrow.length === 0);

check('owner gets 403 on operator deployments', (await call('GET', '/api/operator/deployments', { cookie: owner.cookie })).json?.error?.code === 'OPERATOR_REQUIRED');
check('owner gets 403 on operator reviews', (await call('GET', '/api/operator/reviews', { cookie: owner.cookie })).status === 403);

for (const [name, path, body] of MUTATIONS.slice(0, 5)) {
  const cross = await call('POST', path(ownerOrg, plan), { cookie: owner.cookie, body, origin: 'https://evil.example' });
  check(`403 cross-origin: ${name}`, cross.status === 403);
  const unknown = await call('POST', path(ownerOrg, plan), { cookie: owner.cookie, body });
  check(`unknown plan is refused: ${name}`, [403, 404].includes(unknown.status), `${unknown.status} ${unknown.json?.error?.code}`);
}
const big = await call('POST', `${planPath(ownerOrg, plan)}/pay/submit`, { cookie: owner.cookie, raw: JSON.stringify({ pad: 'x'.repeat(300_000) }) });
check('413 for an oversized submit body', big.status === 413, String(big.status));
const otherOrg = await call('POST', `${planPath(randomUUID(), plan)}/pay/prepare`, { cookie: owner.cookie });
check('another organisation is refused', [403, 404].includes(otherOrg.status), String(otherOrg.status));

// 4. Operator.
const operator = await signIn('operator@cyfer-demo.test', env.DEMO_OPERATOR_PASSWORD);
check('operator signs in', operator.res.status === 200, `status ${operator.res.status}`);
const deployments = await call('GET', '/api/operator/deployments', { cookie: operator.cookie });
check('operator lists deployments', deployments.status === 200 && Array.isArray(deployments.json?.data));
check('operator lists reviews', (await call('GET', '/api/operator/reviews', { cookie: operator.cookie })).status === 200);
const register = await call('POST', '/api/operator/deployments', {
  cookie: operator.cookie,
  body: { deploymentId: randomUUID(), template: 'budget_split', splitRecipients: [0, 1, 2].map((i) => ({ position: i, address: `G${'ABC'[i].repeat(54)}2`, bps: [5000, 3000, 2000][i], label: null })) },
});
check('registration without a Paiflow token is 503 and writes nothing', register.status === 503 && register.json?.error?.code === 'PAIFLOW_NOT_CONFIGURED', `${register.status} ${register.json?.error?.code}`);
const after = await call('GET', '/api/operator/deployments', { cookie: operator.cookie });
check('registry unchanged after the refused registration', after.json?.data?.length === deployments.json?.data?.length);
const resolve = await call('POST', `/api/operator/reviews/${randomUUID()}`, { cookie: operator.cookie, body: { outcome: 'no_action', justification: ' ', evidence: { notes: '' } } });
check('empty justification is 422', resolve.status === 422);

for (const s of [owner, operator]) await call('POST', '/api/auth/sign-out', { cookie: s.cookie });

// 5. Nothing secret in any response.
const all = bodies.join('\n');
check('no secret value in any response', SECRETS.every((v) => !all.includes(v)) && !/pf[dk]_[a-f0-9]{64}/.test(all) && !/"role":"service_role"/.test(all));

const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok || !r.detail ? '' : `  (${r.detail})`}`);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
