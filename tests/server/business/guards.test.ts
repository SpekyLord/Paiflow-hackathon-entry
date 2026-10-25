// Level: MOCKED (session and database are faked). F-12 acceptance: 401 without a session, 403 for non-members and
// wrong roles, operator is a profile flag, inherited admin roles grant nothing.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const state = { userId: null as string | null, memberships: new Map<string, string>(), operators: new Set<string>() };

vi.mock('@/server/auth/session', () => ({
  getAuthUserId: async () => state.userId,
  loadSession: async () => null,
}));

vi.mock('@/server/db/client', () => ({
  getServiceClient: () => ({
    from: (table: string) => {
      const filters: Record<string, string> = {};
      const q = {
        select: () => q,
        eq: (k: string, v: string) => { filters[k] = v; return q; },
        maybeSingle: async () => {
          if (table === 'org_memberships') {
            const role = state.memberships.get(`${filters.org_id}:${filters.user_id}`);
            return { data: role ? { role } : null, error: null };
          }
          if (table === 'profiles') return { data: { is_operator: state.operators.has(filters.user_id) }, error: null };
          return { data: null, error: null };
        },
      };
      return q;
    },
  }),
}));

import { parseUuid, requireOperator, requireOrgMemberOrOperator, requireOrgRole, requireUser } from '@/server/auth/guards';

const ORG = '00000000-0000-4000-8000-000000000001';
const U = '00000000-0000-4000-8000-000000000010';
const code = async (p: Promise<unknown>) => { try { await p; return 'ok'; } catch (e) { return (e as { code: string }).code; } };

beforeEach(() => { state.userId = null; state.memberships.clear(); state.operators.clear(); });

describe('guards', () => {
  it('401 UNAUTHENTICATED without a session, for every guard', async () => {
    expect(await code(requireUser())).toBe('UNAUTHENTICATED');
    expect(await code(requireOrgRole(ORG, ['owner']))).toBe('UNAUTHENTICATED');
    expect(await code(requireOrgMemberOrOperator(ORG))).toBe('UNAUTHENTICATED');
    expect(await code(requireOperator())).toBe('UNAUTHENTICATED');
  });
  it('403 NOT_MEMBER for a non-member, FORBIDDEN for the wrong role, ok for the right one', async () => {
    state.userId = U;
    expect(await code(requireOrgRole(ORG, ['owner', 'approver', 'member']))).toBe('NOT_MEMBER');
    state.memberships.set(`${ORG}:${U}`, 'member');
    expect(await code(requireOrgRole(ORG, ['owner']))).toBe('FORBIDDEN');
    expect(await code(requireOrgRole(ORG, ['owner', 'member']))).toBe('ok');
  });
  it('an operator who is not a member is NOT_MEMBER for member routes but may read plans', async () => {
    state.userId = U;
    state.operators.add(U);
    expect(await code(requireOrgRole(ORG, ['owner', 'approver', 'member']))).toBe('NOT_MEMBER');
    expect((await requireOrgMemberOrOperator(ORG)).role).toBe('operator');
  });
  it('requireOperator needs the profile flag, not a role', async () => {
    state.userId = U;
    state.memberships.set(`${ORG}:${U}`, 'owner');
    expect(await code(requireOperator())).toBe('OPERATOR_REQUIRED');
    state.operators.add(U);
    expect(await code(requireOperator())).toBe('ok');
  });
  it('rejects a malformed organisation ID as NOT_FOUND', async () => {
    state.userId = U;
    expect(await code(requireOrgRole('not-a-uuid', ['owner']))).toBe('NOT_FOUND');
    expect(() => parseUuid('x')).toThrow();
    expect(parseUuid(ORG.toUpperCase())).toBe(ORG);
  });
});
