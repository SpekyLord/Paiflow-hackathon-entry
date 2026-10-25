// Level: MOCKED (no session). G7 criterion 1 / REQ-ACC-01 AC1: every plan, approval, document, payment, wallet and
// operator route answers 401 without a session. Every route file MUST be classified below, so a new route cannot
// slip in unguarded: an unclassified route fails this test.
/// <reference types="vite/client" />
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/server/auth/session', () => ({
  getAuthUserId: async () => null, // nobody is signed in
  loadSession: async () => null,
  createAuthClient: async () => ({ auth: { signOut: async () => ({}), signInWithPassword: async () => ({ error: new Error('x'), data: {} }) } }),
}));

const modules = import.meta.glob('/src/app/api/**/route.ts') as Record<string, () => Promise<Record<string, unknown>>>;

const rel = (path: string) => path.replace('/src/app/api/', '').replace('/route.ts', '');

// Public on purpose.
const PUBLIC_BY_DESIGN = ['auth/sign-in', 'auth/sign-out'];

// Routes that must answer 401 without a session.
const MUST_BE_401 = [/^orgs(\/|$)/, /^operator\//, /^wallet\//, /^auth\/me$/, /^integration\/status$/, /^deals(\/|$)/, /^receipts(\/|$)/];

// KNOWN GAPS, listed so they stay visible. Remove an entry when its route is fixed or deleted.
//  - the inherited earlier-edition routes are still reachable until F-20 (PRD §K.12); Shanti's HO-12 comes first.
const KNOWN_GAPS = [
  'audit', 'auth', 'auth/login', 'auth/logout', 'blockchain', 'blockchain/nodes', 'blockchain/validate',
  'budget', 'consensus', 'consensus/[documentId]/approve', 'consensus/[documentId]/reject',
  'documents', 'documents/[id]', 'summarize', 'verify',
];

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
const MULTIPART = [/^orgs\/\[orgId\]\/documents$/, /^orgs\/\[orgId\]\/verify-file$/];
const DUMMY = '00000000-0000-4000-8000-000000000001';

function classify(route: string): 'public' | 'must401' | 'gap' | 'unclassified' {
  if (PUBLIC_BY_DESIGN.includes(route)) return 'public';
  if (KNOWN_GAPS.includes(route)) return 'gap';
  if (MUST_BE_401.some((r) => r.test(route))) return 'must401';
  return 'unclassified';
}

describe('route authentication sweep', () => {
  const routes = Object.keys(modules).map(rel).sort();

  it('finds the API routes', () => {
    expect(routes.length).toBeGreaterThan(10);
  });

  it('every route is classified (an unclassified route has no declared auth stance)', () => {
    expect(routes.filter((r) => classify(r) === 'unclassified')).toEqual([]);
  });

  it('known gaps still exist (delete the entry when you fix or remove the route)', () => {
    const stale = KNOWN_GAPS.filter((g) => !routes.includes(g));
    expect(stale).toEqual([]);
  });

  for (const [path, load] of Object.entries(modules)) {
    const route = rel(path);
    if (classify(route) !== 'must401') continue;
    it(`${route}: every method answers 401 UNAUTHENTICATED without a session`, async () => {
      const mod = await load();
      const handlers = METHODS.filter((m) => typeof mod[m] === 'function');
      expect(handlers.length).toBeGreaterThan(0);
      const params = Object.fromEntries([...route.matchAll(/\[(\w+)\]/g)].map((m) => [m[1], DUMMY]));
      for (const method of handlers) {
        const multipart = MULTIPART.some((r) => r.test(route));
        const headers: Record<string, string> = {
          origin: 'http://localhost:3000',
          'content-type': multipart ? 'multipart/form-data; boundary=x' : 'application/json',
        };
        const request = new Request(`http://localhost:3000/api/${route}`, {
          method, headers, body: method === 'GET' ? undefined : multipart ? undefined : '{}',
        });
        const res = await (mod[method] as (r: Request, c: unknown) => Promise<Response>)(request, { params: Promise.resolve(params) });
        const body = await res.json().catch(() => null);
        expect({ route, method, status: res.status, code: body?.error?.code }).toEqual({ route, method, status: 401, code: 'UNAUTHENTICATED' });
      }
    }, 30_000);
  }
});
