import { parseUuid, requireOrgRole } from '@/server/auth/guards';
import { parseCreatePlan } from '@/server/business/plan-input';
import { createVersion } from '@/server/business/service';
import { asRecord, readJson } from '@/server/http/json';
import { sameOrigin } from '@/server/http/origin';
import { limit } from '@/server/http/rate-limit';
import { handle } from '@/server/http/respond';

export const runtime = 'nodejs';

export async function POST(request: Request, ctx: { params: Promise<{ orgId: string; planId: string }> }) {
  return handle(async () => {
    sameOrigin(request, 'json');
    const { orgId, planId } = await ctx.params;
    const me = await requireOrgRole(orgId, ['owner']);
    limit('approve', me.userId);
    const input = parseCreatePlan(asRecord(await readJson(request)));
    return createVersion(me.orgId, parseUuid(planId, 'plan'), me.userId, input);
  });
}
