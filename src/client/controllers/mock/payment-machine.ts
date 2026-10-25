import { DEFAULT_ERROR_MESSAGE, type ErrorCode } from "@/contracts/errors";
import { paymentReviewFixture } from "@/contracts/fixtures";
import type { PaymentAttemptViewDTO, PaymentReviewDTO } from "@/contracts/dto";
import type { SafeError, SafeErrorCode, UsePayment } from "@/contracts/controllers";
import { createStore, createTimers } from "../store";
import type { FixtureScenario } from "./scenario";

// Framework-free fixture payment flow behind the mock usePayment hook. It
// simulates every MVP phase without Freighter or the Paiflow SDK.
export type PaymentSnapshot = Pick<UsePayment, "phase" | "review" | "attempt" | "busy" | "error">;
const IDLE: PaymentSnapshot = { phase: "idle", review: null, attempt: null, busy: false, error: null };

const safe = (code: SafeErrorCode, message?: string): SafeError => ({
  code,
  message: message ?? DEFAULT_ERROR_MESSAGE[code as ErrorCode] ?? "Something went wrong.",
});

export function createMockPayment(scenario: () => FixtureScenario) {
  const store = createStore<PaymentSnapshot>(IDLE);
  const timers = createTimers();
  const delay = () => timers.wait(scenario().delayMs);
  const fixture = paymentReviewFixture();
  const attempt = (patch: Partial<PaymentAttemptViewDTO>): PaymentAttemptViewDTO => ({
    attemptId: fixture.attemptId,
    state: "prepared",
    originalTxHash: fixture.originalTxHash,
    expiresAt: fixture.expiresAt,
    submittedAt: null,
    finalStatus: null,
    ledger: null,
    hasSignedEnvelope: false,
    lastCheckedAt: null,
    ...store.get().attempt,
    ...patch,
  });

  async function runCheck() {
    store.set({ phase: "checking", busy: true, error: null });
    if (!(await delay())) return;
    const at = new Date().toISOString();
    const outcome = scenario().payment;
    if (outcome === "failed")
      store.set({ phase: "failed", busy: false, attempt: attempt({ state: "failed", finalStatus: "FAILED", lastCheckedAt: at }) });
    else if (outcome === "unresolved")
      store.set({
        phase: "unresolved",
        busy: false,
        attempt: attempt({ state: "unknown", finalStatus: "UNKNOWN", lastCheckedAt: at }),
        error: safe("UPSTREAM_UNRESOLVED"),
      });
    else
      store.set({ phase: "confirmed", busy: false, attempt: attempt({ state: "success", finalStatus: "SUCCESS", ledger: 1, lastCheckedAt: at }) });
  }

  return {
    getSnapshot: store.get,
    subscribe: store.subscribe,

    async start() {
      const s = store.get();
      if (s.busy) return;
      if (s.review && (s.phase === "review" || s.phase === "awaiting_signature")) {
        store.set({ review: { ...s.review, outcome: "existing" } }); // CL-06: same attempt, no new prepare
        return;
      }
      store.set({ ...IDLE, phase: "preparing", busy: true });
      if (!(await delay())) return;
      if (scenario().payment === "refused_not_approved") {
        store.set({ phase: "refused_not_approved", busy: false, error: safe("PLAN_NOT_APPROVED") });
        return;
      }
      store.set({ phase: "review", busy: false, review: toReview(fixture), attempt: attempt({ state: "prepared" }) });
    },

    async signAndSubmit() {
      const s = store.get();
      if (s.busy || s.phase !== "review") return;
      store.set({ phase: "awaiting_signature", busy: true, error: null, attempt: attempt({ state: "signing" }) });
      if (!(await delay())) return;
      const outcome = scenario().payment;
      if (outcome === "wallet_changed") {
        store.set({ phase: "wallet_changed", busy: false, error: safe("FREIGHTER_WRONG_ACCOUNT", "Wallet changed. Select your bound account in Freighter and keep this record.") });
        return;
      }
      if (outcome === "expired") {
        store.set({ phase: "expired", busy: false, attempt: attempt({ state: "expired_unsigned" }) });
        return;
      }
      store.set({ phase: "submitting", attempt: attempt({ state: "signed_persisted", hasSignedEnvelope: true }) });
      if (!(await delay())) return;
      store.set({ attempt: attempt({ state: "submitted", finalStatus: "PENDING", submittedAt: new Date().toISOString() }) });
      await runCheck();
    },

    // Read-only: never submits.
    async checkOriginal() {
      const s = store.get();
      if (s.busy || !s.attempt?.originalTxHash) return;
      await runCheck();
    },

    // Resends the same stored envelope; only from an unresolved outcome.
    async resubmitSameEnvelope() {
      const s = store.get();
      if (s.busy || s.phase !== "unresolved" || !s.attempt?.hasSignedEnvelope) return;
      store.set({ phase: "submitting", busy: true, error: null });
      if (!(await delay())) return;
      await runCheck();
    },

    stopChecking() {
      if (store.get().phase !== "checking") return;
      timers.cancel();
      store.set({ phase: "unresolved", busy: false });
    },

    dispose: timers.cancel,
  };
}

export type MockPayment = ReturnType<typeof createMockPayment>;

// The signing modal never sees the XDR or passphrase.
function toReview(dto: PaymentReviewDTO): NonNullable<UsePayment["review"]> {
  return {
    attemptId: dto.attemptId,
    network: dto.network,
    originalTxHash: dto.originalTxHash,
    expiresAt: dto.expiresAt,
    amountStroops: dto.amountStroops,
    asset: dto.asset,
    feeStroops: dto.feeStroops,
    deploymentId: dto.deploymentId,
    recipients: dto.recipients,
    outcome: dto.outcome,
  };
}
