import { PLAN_STATES, type PlanState } from "@/contracts/states";
import type { UseFreighter } from "@/contracts/controllers";
import { createStore } from "./store";

// Which fixture story the mock controllers tell. Set it from code with
// setFixtureScenario() or from the URL, e.g.
// ?fixturePlan=payment_confirmed&fixturePartial=1&fixturePayment=unresolved
export const PAYMENT_OUTCOMES = [
  "confirmed",
  "refused_not_approved",
  "wallet_changed",
  "expired",
  "unresolved",
  "failed",
] as const;
export type PaymentOutcome = (typeof PAYMENT_OUTCOMES)[number];

const WALLET_KINDS = ["ok", "unavailable", "empty"] as const;
const FREIGHTER_STATUSES = ["checking", "not_installed", "not_connected", "wrong_network", "connected"] as const;

export interface FixtureScenario {
  planState: PlanState;
  partial: boolean;
  payment: PaymentOutcome;
  wallet: (typeof WALLET_KINDS)[number];
  freighter: UseFreighter["status"];
  delayMs: number;
}

export const DEFAULT_SCENARIO: FixtureScenario = {
  planState: "approved",
  partial: false,
  payment: "confirmed",
  wallet: "ok",
  freighter: "connected",
  delayMs: 400,
};

const pick = <T extends string>(list: readonly T[], value: string | null, fallback: T): T =>
  value !== null && (list as readonly string[]).includes(value) ? (value as T) : fallback;

export function parseScenario(search: string, base: FixtureScenario = DEFAULT_SCENARIO): FixtureScenario {
  const params = new URLSearchParams(search);
  const delay = Number(params.get("fixtureDelay"));
  return {
    planState: pick(PLAN_STATES, params.get("fixturePlan"), base.planState),
    partial: params.has("fixturePartial") ? params.get("fixturePartial") === "1" : base.partial,
    payment: pick(PAYMENT_OUTCOMES, params.get("fixturePayment"), base.payment),
    wallet: pick(WALLET_KINDS, params.get("fixtureWallet"), base.wallet),
    freighter: pick(FREIGHTER_STATUSES, params.get("fixtureFreighter"), base.freighter),
    delayMs: Number.isInteger(delay) && delay >= 0 && delay <= 10_000 && params.has("fixtureDelay") ? delay : base.delayMs,
  };
}

export const scenarioStore = createStore<FixtureScenario>(
  typeof window === "undefined" ? DEFAULT_SCENARIO : parseScenario(window.location.search),
);

export const getFixtureScenario = () => scenarioStore.get();
export const setFixtureScenario = (patch: Partial<FixtureScenario>) => scenarioStore.set(patch);
