"use client";
import type { ControllerHooks } from "@/contracts/controllers";
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
export { getControllerMode } from "./mode";
