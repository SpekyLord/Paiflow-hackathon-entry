import 'server-only';
import type { OrgRole } from '@/contracts/states';
import type { SessionDTO } from '@/contracts/dto';
import { UUID_PATTERN } from '@/contracts/limits';
import { getServiceClient } from '@/server/db/client';
import { HttpError } from '@/server/http/respond';
import { getAuthUserId, loadSession } from './session';

// Roles come from org_memberships / profiles only. The inherited admin/super_admin roles grant nothing here.

export interface UserContext { userId: string }
export interface OrgContext extends UserContext { orgId: string; role: OrgRole }

export function parseUuid(value: string, what = 'resource'): string {
  if (!UUID_PATTERN.test(value)) throw new HttpError('NOT_FOUND', `Unknown ${what}.`);
  return value.toLowerCase();
}

/** 401 without a valid session. */
export async function requireUser(): Promise<UserContext> {
  const userId = await getAuthUserId();
  if (!userId) throw new HttpError('UNAUTHENTICATED');
  return { userId };
}

/** 401 without a session; 403 when the user exists but has no profile (not provisioned). */
export async function requireSession(): Promise<SessionDTO> {
  const { userId } = await requireUser();
  const session = await loadSession(userId);
  if (!session) throw new HttpError('FORBIDDEN');
  return session;
}

async function membershipRole(userId: string, orgId: string): Promise<OrgRole | null> {
  const { data, error } = await getServiceClient()
    .from('org_memberships').select('role').eq('org_id', orgId).eq('user_id', userId).maybeSingle();
  if (error) throw new HttpError('INTERNAL');
  return (data?.role as OrgRole | undefined) ?? null;
}

async function isOperator(userId: string): Promise<boolean> {
  const { data, error } = await getServiceClient().from('profiles').select('is_operator').eq('user_id', userId).maybeSingle();
  if (error) throw new HttpError('INTERNAL');
  return data?.is_operator === true;
}

/** 401 / 403 NOT_MEMBER (not in this org) / 403 FORBIDDEN (member, wrong role). */
export async function requireOrgRole(orgId: string, roles: readonly OrgRole[]): Promise<OrgContext> {
  const { userId } = await requireUser();
  const org = parseUuid(orgId, 'organisation');
  const role = await membershipRole(userId, org);
  if (!role) throw new HttpError('NOT_MEMBER');
  if (!roles.includes(role)) throw new HttpError('FORBIDDEN');
  return { userId, orgId: org, role };
}

export const requireOrgMember = (orgId: string) => requireOrgRole(orgId, ['owner', 'approver', 'member']);

/** Read access for plan views: any member, or the operator. */
export async function requireOrgMemberOrOperator(orgId: string): Promise<UserContext & { orgId: string; role: OrgRole | 'operator' }> {
  const { userId } = await requireUser();
  const org = parseUuid(orgId, 'organisation');
  const role = await membershipRole(userId, org);
  if (role) return { userId, orgId: org, role };
  if (await isOperator(userId)) return { userId, orgId: org, role: 'operator' };
  throw new HttpError('NOT_MEMBER');
}

/** 401 / 403 OPERATOR_REQUIRED. The operator is a profile flag, not an org role. */
export async function requireOperator(): Promise<UserContext> {
  const { userId } = await requireUser();
  if (!(await isOperator(userId))) throw new HttpError('OPERATOR_REQUIRED');
  return { userId };
}
