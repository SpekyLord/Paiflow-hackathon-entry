"use client";
import type {
  SafeError,
  UseFreighter,
  UseOperatorConsole,
  UsePayment,
  UsePlanEvidence,
  UseWalletBinding,
  UseWalletSummary,
} from "@/contracts/controllers";

// Live controllers are C-15 and need the payment routes (C-07…C-13) and
// Francis's business routes. Until then live mode compiles and renders a safe
// "not connected" state instead of calling anything.
const NOT_CONNECTED: SafeError = {
  code: "PAIFLOW_NOT_CONFIGURED",
  message: "Live payment controllers are not connected yet.",
};
const noop = async () => {};

export function useFreighter(): UseFreighter {
  return { status: "checking", address: null, connect: noop, refresh: noop, error: NOT_CONNECTED };
}

export function useWalletBinding(): UseWalletBinding {
  return { binding: null, freighterMatchesBinding: null, phase: "error", bind: noop, error: NOT_CONNECTED };
}

export function usePayment(): UsePayment {
  return {
    phase: "error",
    review: null,
    attempt: null,
    busy: false,
    error: NOT_CONNECTED,
    start: noop,
    signAndSubmit: noop,
    checkOriginal: noop,
    resubmitSameEnvelope: noop,
    stopChecking: () => {},
  };
}

export function usePlanEvidence(): UsePlanEvidence {
  return {
    plan: null,
    loading: false,
    refreshing: false,
    lastRefreshedAt: null,
    error: NOT_CONNECTED,
    reload: noop,
    refreshEvidence: noop,
  };
}

export function useWalletSummary(): UseWalletSummary {
  return { data: null, loading: false, error: NOT_CONNECTED, reload: noop };
}

export function useOperatorConsole(): UseOperatorConsole {
  return {
    deployments: [],
    reviews: [],
    registerDeployment: noop,
    resolveReview: noop,
    reload: noop,
    error: NOT_CONNECTED,
  };
}
