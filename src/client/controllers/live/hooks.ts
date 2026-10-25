"use client";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type {
  PaymentScope,
  SafeError,
  UseFreighter,
  UseOperatorConsole,
  UsePayment,
  UsePlanEvidence,
  UseWalletBinding,
  UseWalletSummary,
} from "@/contracts/controllers";
import type { DeploymentRegistryEntryDTO, OperatorReviewDTO, WalletSummaryDTO } from "@/contracts/dto";
import { createLiveBinding, createLiveEvidence, createLiveFreighter, isSettled, MIN_REFRESH_INTERVAL_MS } from "./machines";
import { createLivePayment } from "./payment-machine";
import { livePorts, toSafeError } from "./ports";

// Live §3.7 hooks (C-15). They call only CYFER routes and Freighter; the
// server decides every financial state. No polling loop makes decisions:
// auto-refresh only asks the server for a read-only reconciliation pass.

function useMachine<S>(machine: { subscribe(listener: () => void): () => void; getSnapshot(): S }): S {
  return useSyncExternalStore(machine.subscribe, machine.getSnapshot, machine.getSnapshot);
}

export function useFreighter(): UseFreighter {
  const [machine] = useState(() => createLiveFreighter(livePorts));
  useEffect(() => void machine.refresh(), [machine]);
  return { ...useMachine(machine), connect: machine.connect, refresh: machine.refresh };
}

export function useWalletBinding(): UseWalletBinding {
  const [machine] = useState(() => createLiveBinding(livePorts));
  useEffect(() => void machine.load(), [machine]);
  return { ...useMachine(machine), bind: machine.bind };
}

const DEAL_NOT_IN_MVP: SafeError = { code: "NOT_FOUND", message: "Protected payments are not part of the MVP." };

export function usePayment(scope: PaymentScope): UsePayment {
  const orgId = scope.kind === "plan" ? scope.orgId : "";
  const planId = scope.kind === "plan" ? scope.planId : "";
  const [machine] = useState(() => createLivePayment(orgId, planId, livePorts));
  useEffect(() => {
    if (scope.kind === "plan") void machine.rehydrate();
    return machine.dispose;
  }, [machine, scope.kind]);
  const snapshot = useMachine(machine);
  const actions = {
    start: machine.start,
    signAndSubmit: machine.signAndSubmit,
    checkOriginal: machine.checkOriginal,
    resubmitSameEnvelope: machine.resubmitSameEnvelope,
    stopChecking: machine.stopChecking,
  };
  if (scope.kind === "deal") return { ...snapshot, ...actions, phase: "error", error: DEAL_NOT_IN_MVP };
  return { ...snapshot, ...actions };
}

export function usePlanEvidence(orgId: string, planId: string, opts?: { auto?: boolean }): UsePlanEvidence {
  const [machine] = useState(() => createLiveEvidence(orgId, planId, livePorts));
  useEffect(() => void machine.reload(), [machine]);
  const snapshot = useMachine(machine);
  const state = snapshot.plan?.state;
  const pending = state === "payment_pending" || state === "payment_confirmed";
  useEffect(() => {
    if (!opts?.auto || !pending || isSettled(state)) return;
    const timer = setInterval(() => void machine.refreshEvidence(), MIN_REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [machine, opts?.auto, pending, state]);
  return { ...snapshot, reload: machine.reload, refreshEvidence: machine.refreshEvidence };
}

export function useWalletSummary(): UseWalletSummary {
  const [data, setData] = useState<WalletSummaryDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<SafeError | null>(null);
  const load = useCallback(
    () =>
      livePorts.getWalletSummary().then(
        (summary) => (setData(summary), setError(null), setLoading(false)),
        (e) => (setError(toSafeError(e)), setLoading(false)),
      ),
    [],
  );
  useEffect(() => void load(), [load]);
  const reload = useCallback(async () => {
    setLoading(true);
    await load();
  }, [load]);
  return { data, loading, error, reload };
}

export function useOperatorConsole(): UseOperatorConsole {
  const [deployments, setDeployments] = useState<DeploymentRegistryEntryDTO[]>([]);
  const [reviews, setReviews] = useState<OperatorReviewDTO[]>([]);
  const [error, setError] = useState<SafeError | null>(null);
  const load = useCallback(
    () =>
      Promise.all([livePorts.listDeployments(), livePorts.listOperatorReviews()]).then(
        ([d, r]) => (setDeployments(d), setReviews(r), setError(null)),
        (e) => setError(toSafeError(e)),
      ),
    [],
  );
  useEffect(() => void load(), [load]);
  const act = (run: () => Promise<unknown>) =>
    run().then(load, (e) => setError(toSafeError(e)));
  return {
    deployments,
    reviews,
    error,
    registerDeployment: (input) => act(() => livePorts.registerDeployment(input)),
    resolveReview: (id, input) => act(() => livePorts.resolveOperatorReview(id, input)),
    reload: load,
  };
}
