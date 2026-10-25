import { requireOrgRole } from '@/server/auth/guards';
import { getServiceClient } from '@/server/db/client';
import { listPlanSummaries } from '@/server/business/plan-detail';
import { parseCreatePlan } from '@/server/business/plan-input';
import { createPlan } from '@/server/business/service';
import { asRecord, readJson } from '@/server/http/json';
import { sameOrigin } from '@/server/http/origin';
import { limit } from '@/server/http/rate-limit';
import { handle } from '@/server/http/respond';

export const runtime = 'nodejs';
type Ctx = { params: Promise<{ orgId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  return handle(async () => {
    const { orgId } = await ctx.params;
    const me = await requireOrgRole(orgId, ['owner', 'approver', 'member']);
    limit('request', me.userId);
    return listPlanSummaries(getServiceClient(), me.orgId);
  });
}

export async function POST(request: Request, ctx: Ctx) {
  return handle(async () => {
    sameOrigin(request, 'json');
    const { orgId } = await ctx.params;
    const me = await requireOrgRole(orgId, ['owner']);
    limit('approve', me.userId);
    const input = parseCreatePlan(asRecord(await readJson(request)));
    return createPlan(me.orgId, me.userId, input);
  });
}
