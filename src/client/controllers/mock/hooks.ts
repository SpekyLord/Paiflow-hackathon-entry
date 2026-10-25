"use client";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { sessionFixture, walletSummaryFixture } from "@/contracts/fixtures";
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
import { createMockPayment } from "./payment-machine";
import { createMockEvidence, isEvidenceSettled, MIN_REFRESH_INTERVAL_MS } from "./evidence-machine";
import { operatorFixtures, validateRegistration, validateResolution } from "./operator";
import { getFixtureScenario, scenarioStore } from "./scenario";

// Fixture-backed implementations of the §3.7 hooks. They never import
// Freighter or the Paiflow SDK and never call the network.
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const fixtureAddress = () => sessionFixture().binding!.address;
const useScenario = () => useSyncExternalStore(scenarioStore.subscribe, scenarioStore.get, scenarioStore.get);

export function useFreighter(): UseFreighter {
  const scenario = useScenario();
  const [connected, setConnected] = useState(false);
  const status = connected ? "connected" : scenario.freighter;
  const error: SafeError | null =
    status === "not_installed"
      ? { code: "FREIGHTER_NOT_INSTALLED", message: "Install or enable Freighter, then reload this page." }
      : status === "wrong_network"
        ? { code: "FREIGHTER_WRONG_NETWORK", message: "Switch Freighter to Testnet." }
        : null;
  const connect = useCallback(async () => {
    if (getFixtureScenario().freighter === "not_installed") return;
    await sleep(getFixtureScenario().delayMs);
    setConnected(true);
  }, []);
  const refresh = useCallback(async () => {}, []);
  return { status, address: status === "connected" ? fixtureAddress() : null, connect, refresh, error };
}

export function useWalletBinding(): UseWalletBinding {
  const scenario = useScenario();
  const [binding, setBinding] = useState(scenario.wallet === "empty" ? null : sessionFixture().binding);
  const [phase, setPhase] = useState<UseWalletBinding["phase"]>(binding ? "bound" : "idle");
  const bind = useCallback(async () => {
    const delay = getFixtureScenario().delayMs;
    for (const step of ["requesting_challenge", "awaiting_signature", "verifying"] as const) {
      setPhase(step);
      await sleep(delay);
    }
    setBinding({ address: fixtureAddress(), verifiedAt: new Date().toISOString() });
    setPhase("bound");
  }, []);
  return {
    binding,
    freighterMatchesBinding: binding ? scenario.freighter === "connected" : null,
    phase,
    bind,
    error: null,
  };
}

export function usePayment(scope: PaymentScope): UsePayment {
  const [machine] = useState(() => createMockPayment(getFixtureScenario));
  useEffect(() => machine.dispose, [machine]);
  const snapshot = useSyncExternalStore(machine.subscribe, machine.getSnapshot, machine.getSnapshot);
  const actions = {
    start: machine.start,
    signAndSubmit: machine.signAndSubmit,
    checkOriginal: machine.checkOriginal,
    resubmitSameEnvelope: machine.resubmitSameEnvelope,
    stopChecking: machine.stopChecking,
  };
  if (scope.kind === "deal")
    return {
      ...snapshot,
      ...actions,
      phase: "error",
      error: { code: "NOT_FOUND", message: "Protected payments are not part of the MVP fixtures." },
    };
  return { ...snapshot, ...actions };
}

export function usePlanEvidence(orgId: string, planId: string, opts?: { auto?: boolean }): UsePlanEvidence {
  const [machine] = useState(() => createMockEvidence(getFixtureScenario));
  useEffect(() => {
    void machine.reload();
    return machine.dispose;
  }, [machine, orgId, planId]);
  const snapshot = useSyncExternalStore(machine.subscribe, machine.getSnapshot, machine.getSnapshot);
  const settled = isEvidenceSettled(snapshot.plan?.state);
  useEffect(() => {
    if (!opts?.auto || settled) return;
    const timer = setInterval(() => void machine.refreshEvidence(), MIN_REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [machine, opts?.auto, settled]);
  return { ...snapshot, reload: machine.reload, refreshEvidence: machine.refreshEvidence };
}

export function useWalletSummary(): UseWalletSummary {
  const [data, setData] = useState<WalletSummaryDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(
    () =>
      sleep(getFixtureScenario().delayMs).then(() => {
        setData(walletSummaryFixture(getFixtureScenario().wallet));
        setLoading(false);
      }),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);
  const reload = useCallback(async () => {
    setLoading(true);
    await load();
  }, [load]);
  return { data, loading, error: null, reload };
}

export function useOperatorConsole(): UseOperatorConsole {
  const [deployments, setDeployments] = useState<DeploymentRegistryEntryDTO[]>(() => operatorFixtures().deployments);
  const [reviews, setReviews] = useState<OperatorReviewDTO[]>(() => operatorFixtures().reviews);
  const [error, setError] = useState<SafeError | null>(null);
  return {
    deployments,
    reviews,
    error,
    async registerDeployment(input) {
      const invalid = validateRegistration(input);
      setError(invalid);
      if (invalid) return;
      await sleep(getFixtureScenario().delayMs);
      setDeployments((list) => [...list, { ...input, status: "available", registeredAt: new Date().toISOString() }]);
    },
    async resolveReview(id, input) {
      const invalid = validateResolution(input);
      setError(invalid);
      if (invalid) return;
      await sleep(getFixtureScenario().delayMs);
      setReviews((list) =>
        list.map((r) => (r.reviewId === id ? { ...r, outcome: input.outcome, resolvedAt: new Date().toISOString() } : r)),
      );
    },
    async reload() {
      setError(null);
    },
  };
}
