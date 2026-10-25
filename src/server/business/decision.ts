import 'server-only';
import type { BudgetPlanDetailDTO } from '@/contracts/dto';
import { SHA256_HEX_PATTERN, UUID_PATTERN } from '@/contracts/limits';
import { decideBudgetPlan } from '@/server/db/business';
import { asRecord, readJson } from '@/server/http/json';
import { sameOrigin } from '@/server/http/origin';
import { limit } from '@/server/http/rate-limit';
import { HttpError, handle } from '@/server/http/respond';
import { parseUuid, requireOrgRole } from '@/server/auth/guards';
import { detailFor } from './service';

/** Shared body of the approve and reject routes. The server re-checks version and hash, so a stale page cannot approve. */
export function decisionRoute(decision: 'approved' | 'rejected') {
  return async function POST(request: Request, ctx: { params: Promise<{ orgId: string; planId: string }> }) {
    return handle<BudgetPlanDetailDTO>(async () => {
      sameOrigin(request, 'json');
      const { orgId, planId } = await ctx.params;
      const me = await requireOrgRole(orgId, ['owner', 'approver']);
      limit('approve', me.userId);
      const plan = parseUuid(planId, 'plan');
      const body = asRecord(await readJson(request));
      const versionId = typeof body.versionId === 'string' ? body.versionId.toLowerCase() : '';
      const planSha256 = typeof body.planSha256 === 'string' ? body.planSha256 : '';
      const reason = typeof body.reason === 'string' ? body.reason.trim() : null;
      const fields: Record<string, string> = {};
      if (!UUID_PATTERN.test(versionId)) fields.versionId = 'Missing plan version.';
      if (!SHA256_HEX_PATTERN.test(planSha256)) fields.planSha256 = 'Missing plan hash.';
      if (decision === 'rejected' && (!reason || reason.length > 500)) fields.reason = 'Give a reason of up to 500 characters.';
      if (Object.keys(fields).length) throw new HttpError('VALIDATION', undefined, { fields });

      const r = await decideBudgetPlan({
        actorUserId: me.userId, planId: plan, versionId, planSha256, decision, reason: decision === 'rejected' ? reason : null,
      });
      if (!r.ok) throw new HttpError(r.code);
      return detailFor(me.orgId, plan, me.userId);
    });
  };
}
