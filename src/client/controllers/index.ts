"use client";
import { useMemo } from "react";
import type { ControllerHooks } from "@/contracts/controllers";
import { budgetVsActual } from "@/lib/budget-vs-actual";
import type { UseBudgetVsActual } from "./erp-types";
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
export type { UseBudgetVsActual } from "./erp-types";
export { getControllerMode } from "./mode";
