import type { SafeError, UsePlanEvidence } from "@/contracts/controllers";
import type { MoneyMovementDTO, MoneyMovementsPage } from "@/lib/money-movements";
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

export interface UseMoneyMovements {
  rows: MoneyMovementDTO[];
  totals: MoneyMovementsPage["totals"] | null;
  loading: boolean;
  /** True while there is an older page to load. */
  hasMore: boolean;
  error: SafeError | null;
  /** Download link for the CSV export (same-origin, member only). */
  csvPath: string;
  reload(): Promise<void>;
  loadMore(): Promise<void>;
}
