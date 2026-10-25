import type { BudgetPlanDetailDTO } from "@/contracts/dto";
import type { PlanState } from "@/contracts/states";

// ERP-BVA-1: per-envelope view of data the plan already carries. Everything
// that is compared is stroops (bigint). The PHP planning figure is passed
// through untouched and is never converted to, or compared with, stroops.
export type BudgetRowStatus = "planned" | "approved" | "pending" | "verified" | "mismatch";

export interface BudgetVsActualRow {
  position: number;
  label: string;
  bps: number;
  /** Integer centavo string, a planning figure only. */
  plannedPhpCentavos: string | null;
  approvedStroops: string;
  status: BudgetRowStatus;
  /** Observed amount, set only when the payout is verified. */
  verifiedStroops: string | null;
  /** approved - verified, set only when the payout is verified. */
  varianceStroops: string | null;
  /** On a mismatch row both amounts are kept and no variance is computed. */
  observedStroops: string | null;
  needsReview: boolean;
}

export interface BudgetVsActualTotals {
  /** Sum of approved shares (one unit: stroops). */
  approvedStroops: string;
  /** Sum of verified amounts, only once every envelope is verified. */
  verifiedStroops: string | null;
  /** Only once every envelope is verified. */
  varianceStroops: string | null;
  verifiedCount: number;
  totalCount: number;
}

export interface BudgetVsActual {
  planState: PlanState;
  rows: BudgetVsActualRow[];
  totals: BudgetVsActualTotals;
}

const PENDING_PLAN_STATES: readonly PlanState[] = [
  "payment_pending",
  "payment_confirmed",
  "distribution_verified",
  "mismatch",
  "operator_review",
];

function planStatus(state: PlanState): BudgetRowStatus {
  if (state === "approved") return "approved";
  if (PENDING_PLAN_STATES.includes(state)) return "pending";
  return "planned";
}

export function budgetVsActual(plan: BudgetPlanDetailDTO): BudgetVsActual {
  const rows: BudgetVsActualRow[] = plan.envelopes.map((env) => {
    const payout = env.payout;
    let status = planStatus(plan.state);
    let verifiedStroops: string | null = null;
    let varianceStroops: string | null = null;
    let observedStroops: string | null = null;
    if (payout?.state === "verified" && payout.observedAmountStroops !== null) {
      status = "verified";
      verifiedStroops = payout.observedAmountStroops;
      varianceStroops = (BigInt(env.expectedShareStroops) - BigInt(verifiedStroops)).toString();
    } else if (payout?.state === "mismatch") {
      status = "mismatch";
      observedStroops = payout.observedAmountStroops;
    }
    return {
      position: env.position,
      label: env.label,
      bps: env.bps,
      plannedPhpCentavos: env.planningPhpCentavos,
      approvedStroops: env.expectedShareStroops,
      status,
      verifiedStroops,
      varianceStroops,
      observedStroops,
      needsReview: payout?.state === "operator_review",
    };
  });

  const approved = rows.reduce((sum, r) => sum + BigInt(r.approvedStroops), 0n);
  const verifiedCount = rows.filter((r) => r.status === "verified").length;
  const allVerified = rows.length > 0 && verifiedCount === rows.length;
  const verified = allVerified ? rows.reduce((sum, r) => sum + BigInt(r.verifiedStroops!), 0n) : null;
  return {
    planState: plan.state,
    rows,
    totals: {
      approvedStroops: approved.toString(),
      verifiedStroops: verified === null ? null : verified.toString(),
      varianceStroops: verified === null ? null : (approved - verified).toString(),
      verifiedCount,
      totalCount: rows.length,
    },
  };
}
