import { requireOrgRole } from '@/server/auth/guards';
import { listOrgMembers } from '@/server/business/directory';
import { getServiceClient } from '@/server/db/client';
import { limit } from '@/server/http/rate-limit';
import { handle } from '@/server/http/respond';

export const runtime = 'nodejs';

export async function GET(_request: Request, ctx: { params: Promise<{ orgId: string }> }) {
  return handle(async () => {
    const { orgId } = await ctx.params;
    const me = await requireOrgRole(orgId, ['owner', 'approver', 'member']);
    limit('request', me.userId);
    return listOrgMembers(getServiceClient(), me.orgId, me.userId);
  });
}
