import type { UseFreighter, UsePlanEvidence, UseWalletBinding } from "@/contracts/controllers";
import { createStore } from "../store";
import { errorCode, toSafeError, type LivePorts } from "./ports";

// Live plan evidence, wallet binding and Freighter status, framework-free.

export const MIN_REFRESH_INTERVAL_MS = 15_000;
export type EvidenceSnapshot = Pick<UsePlanEvidence, "plan" | "loading" | "refreshing" | "lastRefreshedAt" | "error">;

export function isSettled(state: string | undefined) {
  return state === "distribution_verified" || state === "mismatch";
}

export function createLiveEvidence(orgId: string, planId: string, ports: LivePorts, now: () => number = Date.now) {
  const store = createStore<EvidenceSnapshot>({ plan: null, loading: true, refreshing: false, lastRefreshedAt: null, error: null });
  let last = 0;
  return {
    getSnapshot: store.get,
    subscribe: store.subscribe,
    // Pure read of Francis's plan detail.
    async reload() {
      store.set({ loading: true, error: null });
      try {
        store.set({ plan: await ports.getPlan(orgId, planId), loading: false });
      } catch (error) {
        store.set({ loading: false, error: toSafeError(error) });
      }
    },
    // One bounded, read-only reconciliation pass on the server.
    async refreshEvidence() {
      if (store.get().refreshing) return;
      const wait = last + MIN_REFRESH_INTERVAL_MS - now();
      if (last && wait > 0) {
        store.set({ error: { code: "RATE_LIMITED", message: "Evidence was refreshed moments ago.", retryAfterMs: wait } });
        return;
      }
      last = now();
      store.set({ refreshing: true, error: null });
      try {
        const plan = await ports.refreshPlanEvidence(orgId, planId);
        store.set({ plan, refreshing: false, lastRefreshedAt: new Date(now()).toISOString() });
      } catch (error) {
        store.set({ refreshing: false, error: toSafeError(error) });
      }
    },
  };
}

export type BindingSnapshot = Pick<UseWalletBinding, "binding" | "freighterMatchesBinding" | "phase" | "error">;

export function createLiveBinding(ports: LivePorts) {
  const store = createStore<BindingSnapshot>({ binding: null, freighterMatchesBinding: null, phase: "idle", error: null });
  const compare = async () => {
    const binding = store.get().binding;
    if (!binding) return store.set({ freighterMatchesBinding: null });
    try {
      store.set({ freighterMatchesBinding: (await ports.freighter.refresh()) === binding.address });
    } catch {
      store.set({ freighterMatchesBinding: null });
    }
  };
  return {
    getSnapshot: store.get,
    subscribe: store.subscribe,
    async load() {
      try {
        const binding = (await ports.getMe()).binding;
        store.set({ binding, phase: binding ? "bound" : "idle" });
        await compare();
      } catch (error) {
        store.set({ phase: "error", error: toSafeError(error) });
      }
    },
    // challenge (Francis's route) → Freighter signMessage → bind (Francis's route).
    async bind() {
      const phase = store.get().phase;
      if (phase === "requesting_challenge" || phase === "awaiting_signature" || phase === "verifying") return;
      try {
        store.set({ phase: "requesting_challenge", error: null });
        const address = await ports.freighter.connect();
        const challenge = await ports.challenge(address);
        store.set({ phase: "awaiting_signature" });
        const signedMessage = await ports.freighter.signChallenge(challenge.message, address);
        store.set({ phase: "verifying" });
        const binding = await ports.bind({ challengeId: challenge.challengeId, address, signedMessage, signerAddress: address });
        store.set({ binding, phase: "bound", freighterMatchesBinding: true });
      } catch (error) {
        store.set({ phase: "error", error: toSafeError(error) });
      }
    },
  };
}

export type FreighterSnapshot = Pick<UseFreighter, "status" | "address" | "error">;

export function createLiveFreighter(ports: LivePorts) {
  const store = createStore<FreighterSnapshot>({ status: "checking", address: null, error: null });
  const settle = async (read: () => Promise<string>) => {
    try {
      const address = await read();
      const testnet = await ports.freighter.isOnTestnet();
      store.set({
        status: testnet ? "connected" : "wrong_network",
        address,
        error: testnet ? null : { code: "FREIGHTER_WRONG_NETWORK", message: "Switch Freighter to Testnet." },
      });
    } catch (error) {
      const code = errorCode(error);
      store.set({
        status: code === "FREIGHTER_NOT_INSTALLED" ? "not_installed" : "not_connected",
        address: null,
        error: code === "FREIGHTER_DENIED" ? null : toSafeError(error),
      });
    }
  };
  return {
    getSnapshot: store.get,
    subscribe: store.subscribe,
    refresh: () => settle(ports.freighter.refresh),
    connect: () => settle(ports.freighter.connect),
  };
}
