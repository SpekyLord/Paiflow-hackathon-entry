import { requireOrgRole } from '@/server/auth/guards';
import { getServiceClient } from '@/server/db/client';
import { getSplitDeployment } from '@/server/business/plan-detail';
import { limit } from '@/server/http/rate-limit';
import { handle } from '@/server/http/respond';

export const runtime = 'nodejs';

export async function GET(_request: Request, ctx: { params: Promise<{ orgId: string }> }) {
  return handle(async () => {
    const { orgId } = await ctx.params;
    const me = await requireOrgRole(orgId, ['owner']);
    limit('request', me.userId);
    return getSplitDeployment(getServiceClient());
  });
}
