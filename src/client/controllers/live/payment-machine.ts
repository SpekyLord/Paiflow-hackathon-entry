import type { PaymentAttemptViewDTO, PaymentReviewDTO } from "@/contracts/dto";
import type { UsePayment } from "@/contracts/controllers";
import { createStore } from "../store";
import { errorCode, toSafeError, type LivePorts } from "./ports";

// Live usePayment for a budget plan. Every step is an explicit user action;
// the only automatic call is one read-only check right after submitting.
// Nothing is kept in localStorage: after a reload the attempt is read back
// from the plan, and start() returns the same open attempt (CL-06).
export type PaymentSnapshot = Pick<UsePayment, "phase" | "review" | "attempt" | "busy" | "error">;
type Phase = UsePayment["phase"];
const IDLE: PaymentSnapshot = { phase: "idle", review: null, attempt: null, busy: false, error: null };

export function phaseFor(attempt: PaymentAttemptViewDTO): Phase {
  if (attempt.finalStatus === "SUCCESS") return "confirmed";
  if (attempt.finalStatus === "FAILED") return "failed";
  if (attempt.state === "expired_unsigned") return "expired";
  if (attempt.state === "prepared" || attempt.state === "signing" || attempt.state === "preparing") return "idle";
  return "unresolved"; // submitted, pending, unknown, rejected, operator_review, not found: never "failed"
}

const reviewView = (r: PaymentReviewDTO): NonNullable<UsePayment["review"]> => ({
  attemptId: r.attemptId,
  network: r.network,
  originalTxHash: r.originalTxHash,
  expiresAt: r.expiresAt,
  amountStroops: r.amountStroops,
  asset: r.asset,
  feeStroops: r.feeStroops,
  deploymentId: r.deploymentId,
  recipients: r.recipients,
  outcome: r.outcome,
});

export function createLivePayment(orgId: string, planId: string, ports: LivePorts) {
  const store = createStore<PaymentSnapshot>(IDLE);
  let prepared: PaymentReviewDTO | null = null; // holds the unsigned XDR in memory only
  let checking: AbortController | null = null;
  const set = store.set;
  const fail = (error: unknown, phase: Phase = "error") => set({ phase, busy: false, error: toSafeError(error) });

  async function checkOriginal() {
    const attempt = store.get().attempt;
    if (store.get().phase === "checking" || !attempt?.originalTxHash) return;
    checking = new AbortController();
    set({ phase: "checking", busy: true, error: null });
    try {
      const next = await ports.checkPlanPayment(orgId, planId, attempt.attemptId, checking.signal);
      set({ attempt: next, phase: phaseFor(next), busy: false });
    } catch (error) {
      if (store.get().phase === "checking") fail(error, "unresolved");
    } finally {
      checking = null;
    }
  }

  return {
    getSnapshot: store.get,
    subscribe: store.subscribe,

    // Reads the plan's attempt after a reload; never prepares.
    async rehydrate() {
      try {
        const attempt = (await ports.getPlan(orgId, planId)).payment;
        if (attempt && !store.get().busy) set({ attempt, phase: phaseFor(attempt) });
      } catch {
        // The page shows the plan's own error; the hook stays idle.
      }
    },

    async start() {
      if (store.get().busy) return;
      set({ phase: "preparing", busy: true, error: null });
      try {
        prepared = await ports.preparePlanPayment(orgId, planId);
        const attempt: PaymentAttemptViewDTO = {
          attemptId: prepared.attemptId, state: "signing", originalTxHash: prepared.originalTxHash,
          expiresAt: prepared.expiresAt, submittedAt: null, finalStatus: null, ledger: null,
          hasSignedEnvelope: false, lastCheckedAt: null,
        };
        set({ phase: "review", busy: false, review: reviewView(prepared), attempt });
      } catch (error) {
        const code = errorCode(error);
        fail(error, code === "PLAN_NOT_APPROVED" ? "refused_not_approved" : code === "ATTEMPT_UNRESOLVED" ? "unresolved" : "error");
      }
    },

    // Explicit consent click: Freighter signs, then the server submits.
    async signAndSubmit() {
      const s = store.get();
      if (s.busy || s.phase !== "review" || !prepared) return;
      set({ phase: "awaiting_signature", busy: true, error: null });
      let signedXdr: string;
      try {
        const bound = (await ports.getMe()).binding?.address;
        if (!bound)
          return set({ phase: "wallet_changed", busy: false, error: { code: "WALLET_MISMATCH", message: "Bind your wallet before signing." } });
        signedXdr = await ports.freighter.signPrepared(prepared, bound);
      } catch (error) {
        const code = errorCode(error);
        if (code === "PREPARATION_EXPIRED") return fail(error, "expired");
        if (code === "FREIGHTER_WRONG_ACCOUNT") return fail(error, "wallet_changed");
        return fail(error, code === "SIGNATURE_DECLINED" ? "review" : "error");
      }
      set({ phase: "submitting" });
      try {
        const attempt = await ports.submitPlanPayment(orgId, planId, prepared.attemptId, signedXdr);
        prepared = null;
        set({ attempt, phase: phaseFor(attempt), busy: false });
      } catch (error) {
        // A lost response is unknown, never failed, and is not retried.
        return fail(error, errorCode(error) === "UPSTREAM_UNRESOLVED" ? "unresolved" : "error");
      }
      if (store.get().phase === "unresolved") await checkOriginal();
    },

    checkOriginal,

    // Separate button plus confirm dialog in the UI.
    async resubmitSameEnvelope() {
      const s = store.get();
      if (s.busy || !s.attempt?.hasSignedEnvelope || !s.attempt.originalTxHash) return;
      set({ phase: "submitting", busy: true, error: null });
      try {
        const attempt = await ports.resubmitPlanPayment(orgId, planId, s.attempt.attemptId, s.attempt.originalTxHash);
        set({ attempt, phase: phaseFor(attempt), busy: false });
      } catch (error) {
        fail(error, "unresolved");
      }
    },

    stopChecking() {
      if (store.get().phase !== "checking") return;
      checking?.abort();
      set({ phase: "unresolved", busy: false });
    },

    dispose() {
      checking?.abort();
    },
  };
}

export type LivePayment = ReturnType<typeof createLivePayment>;
