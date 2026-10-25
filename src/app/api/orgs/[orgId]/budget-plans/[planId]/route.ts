import { parseUuid, requireOrgMemberOrOperator } from '@/server/auth/guards';
import { detailFor } from '@/server/business/service';
import { limit } from '@/server/http/rate-limit';
import { handle } from '@/server/http/respond';

export const runtime = 'nodejs';

export async function GET(_request: Request, ctx: { params: Promise<{ orgId: string; planId: string }> }) {
  return handle(async () => {
    const { orgId, planId } = await ctx.params;
    const me = await requireOrgMemberOrOperator(orgId);
    limit('request', me.userId);
    return detailFor(me.orgId, parseUuid(planId, 'plan'), me.userId);
  });
}
