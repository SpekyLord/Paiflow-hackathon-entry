import "server-only";
import type { BudgetPlanDetailDTO } from "@/contracts/dto";
import { requireSession, type PaymentDeps } from "@/server/paiflow/deps";
import { loadContext, type PlanParams } from "@/server/paiflow/payment";
import { reconcilePlan } from "@/server/paiflow/reconcile";
import { readJson, requireSameOrigin, RouteError } from "@/server/paiflow/route-kit";

// C-12: POST .../evidence/refresh. Any member may run one bounded,
// read-only reconciliation pass, at least 15 s apart per plan, and gets the
// updated plan detail back. It never submits or prepares.
export const MIN_REFRESH_INTERVAL_MS = 15_000;

// Process-local, like the rate limits: enough for the single demo server.
const lastRefresh = new Map<string, number>();

export async function refreshEvidenceHandler(
  deps: PaymentDeps,
  request: Request,
  params: PlanParams,
  gate: Map<string, number> = lastRefresh,
): Promise<BudgetPlanDetailDTO> {
  requireSameOrigin(request);
  const session = await requireSession(deps, request);
  deps.rateLimit("check", session.userId);
  await readJson(request);
  await loadContext(deps, session, params); // member of this org, or 403/404

  const now = deps.now();
  const last = gate.get(params.planId);
  if (last !== undefined && now - last < MIN_REFRESH_INTERVAL_MS)
    throw new RouteError("RATE_LIMITED", "Evidence was refreshed moments ago.", Math.ceil((last + MIN_REFRESH_INTERVAL_MS - now) / 1000));
  gate.set(params.planId, now);

  await reconcilePlan(deps, { planId: params.planId, actorUserId: session.userId, holder: `refresh:${session.userId}` });
  return deps.planDetail(params.orgId, params.planId, session.userId);
}
