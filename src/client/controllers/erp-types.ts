import type { UsePlanEvidence } from "@/contracts/controllers";
import type { BudgetVsActual } from "@/lib/budget-vs-actual";

// ERP hooks (docs/CARLOS-ERP-MODULES.md). Carlos-owned; not part of the
// canonical §3.7 ControllerHooks, so fixture and live mode share them.
export interface UseBudgetVsActual {
  /** Null until the plan has loaded. */
  view: BudgetVsActual | null;
  loading: boolean;
  refreshing: boolean;
  error: UsePlanEvidence["error"];
  lastRefreshedAt: UsePlanEvidence["lastRefreshedAt"];
  reload(): Promise<void>;
  refreshEvidence(): Promise<void>;
}
