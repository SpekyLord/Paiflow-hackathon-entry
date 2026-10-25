// Organisation directory reads (CR-03). Pure over an injected client so they are unit-testable.
// Members see names and roles only: never emails, internal flags or wallet addresses.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { OrgMemberDTO, PlanVersionIndexDTO } from '@/contracts/dto';
import type { OrgRole } from '@/contracts/states';
import { HttpError } from '@/server/http/respond';

type Row = Record<string, unknown>;

async function rows(q: PromiseLike<{ data: unknown; error: { code?: string } | null }>, label: string): Promise<Row[]> {
  const { data, error } = await q;
  if (error) {
    console.error('[db] read error', label, error.code ?? 'unknown');
    throw new HttpError('INTERNAL');
  }
  return (data ?? []) as Row[];
}

const ROLE_ORDER: Record<OrgRole, number> = { owner: 0, approver: 1, member: 2 };

export async function listOrgMembers(db: SupabaseClient, orgId: string, viewerUserId: string): Promise<OrgMemberDTO[]> {
  const members = await rows(db.from('org_memberships').select('user_id, role').eq('org_id', orgId), 'members');
  if (members.length === 0) return [];
  const ids = members.map((m) => m.user_id as string);
  const [profiles, bindings] = await Promise.all([
    rows(db.from('profiles').select('user_id, display_name').in('user_id', ids), 'profiles'),
    rows(db.from('wallet_bindings').select('user_id').in('user_id', ids).is('revoked_at', null), 'bindings'),
  ]);
  const name = new Map(profiles.map((p) => [p.user_id as string, p.display_name as string]));
  const bound = new Set(bindings.map((b) => b.user_id as string));
  return members
    .map((m) => ({
      userId: m.user_id as string,
      displayName: name.get(m.user_id as string) ?? 'Member',
      role: m.role as OrgRole,
      hasVerifiedWallet: bound.has(m.user_id as string),
      isViewer: m.user_id === viewerUserId,
    }))
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.displayName.localeCompare(b.displayName));
}

export async function listPlanVersionIndex(db: SupabaseClient, orgId: string): Promise<PlanVersionIndexDTO[]> {
  const plans = await rows(db.from('budget_plans').select('id').eq('org_id', orgId).limit(200), 'plans');
  if (plans.length === 0) return [];
  const planIds = plans.map((p) => p.id as string);
  const versions = await rows(
    db.from('budget_plan_versions')
      .select('id, plan_id, version, purpose, plan_sha256, created_at, superseded_at')
      .in('plan_id', planIds).order('created_at', { ascending: false }).limit(500),
    'versions',
  );
  return versions.map((v) => ({
    versionId: v.id as string,
    planId: v.plan_id as string,
    version: v.version as number,
    purpose: v.purpose as string,
    planSha256: v.plan_sha256 as string,
    createdAt: v.created_at as string,
    superseded: v.superseded_at !== null && v.superseded_at !== undefined,
  }));
}
