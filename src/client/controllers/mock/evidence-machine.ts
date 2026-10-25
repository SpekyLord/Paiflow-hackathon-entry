import { planDetailFixture } from "@/contracts/fixtures";
import type { PlanState } from "@/contracts/states";
import type { UsePlanEvidence } from "@/contracts/controllers";
import { createStore, createTimers } from "./store";
import type { FixtureScenario } from "./scenario";

// Framework-free fixture plan evidence behind the mock usePlanEvidence hook.
export const MIN_REFRESH_INTERVAL_MS = 15_000;
export type EvidenceSnapshot = Pick<UsePlanEvidence, "plan" | "loading" | "refreshing" | "lastRefreshedAt" | "error">;

// Each refresh moves a paid plan one step closer to a verified distribution.
function nextFixture(state: PlanState, partial: boolean): { state: PlanState; partial: boolean } {
  if (state === "payment_pending") return { state: "payment_confirmed", partial: false };
  if (state === "payment_confirmed" && !partial) return { state: "payment_confirmed", partial: true };
  if (state === "payment_confirmed") return { state: "distribution_verified", partial: false };
  return { state, partial };
}

export function isEvidenceSettled(state: PlanState | undefined): boolean {
  return state !== "payment_pending" && state !== "payment_confirmed";
}

export function createMockEvidence(scenario: () => FixtureScenario) {
  const store = createStore<EvidenceSnapshot>({
    plan: null,
    loading: false,
    refreshing: false,
    lastRefreshedAt: null,
    error: null,
  });
  const timers = createTimers();
  let current = { state: scenario().planState, partial: scenario().partial };
  let lastRefreshAt = 0;

  return {
    getSnapshot: store.get,
    subscribe: store.subscribe,

    async reload() {
      store.set({ loading: true, error: null });
      if (!(await timers.wait(scenario().delayMs))) return;
      store.set({ loading: false, plan: planDetailFixture(current.state, { partial: current.partial }) });
    },

    async refreshEvidence() {
      const s = store.get();
      if (s.refreshing) return;
      const waitMs = lastRefreshAt + MIN_REFRESH_INTERVAL_MS - Date.now();
      if (lastRefreshAt && waitMs > 0) {
        store.set({ error: { code: "RATE_LIMITED", message: "Evidence was just refreshed. Try again shortly.", retryAfterMs: waitMs } });
        return;
      }
      lastRefreshAt = Date.now();
      store.set({ refreshing: true, error: null });
      if (!(await timers.wait(scenario().delayMs))) return;
      current = nextFixture(current.state, current.partial);
      store.set({
        refreshing: false,
        plan: planDetailFixture(current.state, { partial: current.partial }),
        lastRefreshedAt: new Date().toISOString(),
      });
    },

    dispose: timers.cancel,
  };
}

export type MockEvidence = ReturnType<typeof createMockEvidence>;
