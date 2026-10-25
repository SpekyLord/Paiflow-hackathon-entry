"use client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { listMoneyMovements, moneyMovementsCsvPath } from "@/client/api/payments";
import { toSafeError } from "./live/ports";
import { moneyMovementsFixture } from "./mock/money-movements";
import { createMovementsStore } from "./money-movements";
import type { ControllerHooks } from "@/contracts/controllers";
import { budgetVsActual } from "@/lib/budget-vs-actual";
import type { UseBudgetVsActual, UseMoneyMovements } from "./erp-types";
import * as live from "./live/hooks";
import * as mock from "./mock/hooks";

// The §3.7 hooks Shanti imports. The mode is fixed at build time, so each
// hook keeps the same identity for the life of the page. The condition is
// written inline (not via getControllerMode) so production builds can drop
// the fixture branch.
const hooks: ControllerHooks =
  process.env.NEXT_PUBLIC_CYFER_FIXTURES === "1" && process.env.NODE_ENV !== "production"
    ? mock
    : live;

export const useFreighter = hooks.useFreighter;
export const useWalletBinding = hooks.useWalletBinding;
export const usePayment = hooks.usePayment;
export const usePlanEvidence = hooks.usePlanEvidence;
export const useWalletSummary = hooks.useWalletSummary;
export const useOperatorConsole = hooks.useOperatorConsole;
// ERP-BVA-2: derived from the plan evidence the page already loads, so it
// makes no network call of its own and works in fixture and live mode.
export function useBudgetVsActual(orgId: string, planId: string, opts?: { auto?: boolean }): UseBudgetVsActual {
  const evidence = usePlanEvidence(orgId, planId, opts);
  const view = useMemo(() => (evidence.plan ? budgetVsActual(evidence.plan) : null), [evidence.plan]);
  return {
    view,
    loading: evidence.loading,
    refreshing: evidence.refreshing,
    error: evidence.error,
    lastRefreshedAt: evidence.lastRefreshedAt,
    reload: evidence.reload,
    refreshEvidence: evidence.refreshEvidence,
  };
}

// ERP-LOG-3: fixture mode serves local rows with no network call.
export function useMoneyMovements(orgId: string): UseMoneyMovements {
  const [store] = useState(() =>
    createMovementsStore(
      process.env.NEXT_PUBLIC_CYFER_FIXTURES === "1" && process.env.NODE_ENV !== "production"
        ? async () => moneyMovementsFixture()
        : (before) => listMoneyMovements(orgId, { before }),
      toSafeError,
    ),
  );
  useEffect(() => void store.reload(), [store]);
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return {
    rows: state.rows,
    totals: state.totals,
    loading: state.loading,
    hasMore: state.nextBefore !== null,
    error: state.error,
    csvPath: moneyMovementsCsvPath(orgId),
    reload: store.reload,
    loadMore: store.loadMore,
  };
}
export type { UseBudgetVsActual, UseMoneyMovements } from "./erp-types";
export { getControllerMode } from "./mode";
