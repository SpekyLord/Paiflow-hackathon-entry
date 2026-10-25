import "server-only";
import { PAYOUT_EVIDENCE_THRESHOLD_SECONDS } from "@/contracts/limits";
import type { PaymentAttemptState, VerificationState } from "@/contracts/states";
import type { PayScope } from "@/server/db/financial-core";
import type { PaymentDeps } from "@/server/paiflow/deps";
import { ingestEvents } from "@/server/paiflow/events";
import { RouteError } from "@/server/paiflow/route-kit";
import { checkOnce } from "@/server/paiflow/status";
import { verifyDistribution, verifyPaymentReceipt, type PayoutEventShape } from "@/server/paiflow/verify";

// C-12 (PRD §G.6): one bounded reconciliation pass for a budget plan.
// Read-only toward Paiflow: a status lookup on the original hash, event
// ingestion for that hash, then the H.1/H.2/H.5 checks recorded through
// Francis's RPCs, which own every plan state change. It never prepares or
// submits.

export interface ReconcileSummary {
  planId: string;
  status: "ran" | "lease_busy" | "budget_exhausted" | "no_attempt";
  attemptState: PaymentAttemptState | null;
  finalStatus: string | null;
  receipt: VerificationState | null;
  payouts: { verified: number; total: number } | null;
  reviewOpened: boolean;
  retryAfterSeconds: number | null;
}

export interface ReconcileOptions {
  planId: string;
  actorUserId: string; // a member: the refreshing user, or the attempt's creator for the worker
  holder: string;
  // Defaults to the recorded Split payout shape (unknown until B-04 closes).
  payoutShape?: PayoutEventShape | null;
}

const LEASE_TTL_SECONDS = 120;

export async function reconcilePlan(deps: PaymentDeps, options: ReconcileOptions): Promise<ReconcileSummary> {
  const { planId, actorUserId, holder } = options;
  const scope: PayScope = { kind: "plan", planId };
  const summary: ReconcileSummary = {
    planId,
    status: "ran",
    attemptState: null,
    finalStatus: null,
    receipt: null,
    payouts: null,
    reviewOpened: false,
    retryAfterSeconds: null,
  };

  const leaseKey = `reconcile:plan:${planId}`;
  if (!(await deps.db.acquireReconcileLease(leaseKey, holder, LEASE_TTL_SECONDS))) return { ...summary, status: "lease_busy" };
  try {
    const budget = await deps.db.consumeReconcileBudget(scope);
    if (!budget.allowed) return { ...summary, status: "budget_exhausted", retryAfterSeconds: budget.retryAfterSeconds };

    const context = await deps.db.getPaymentContext(scope, actorUserId);
    if (!context.ok) throw new RouteError(context.code);
    let attempt = await deps.db.getLatestAttempt(scope);
    if (!attempt?.originalTxHash) return { ...summary, status: "no_attempt" };
    const originalTxHash = attempt.originalTxHash;

    // 1. Status of the original hash (never a resubmit).
    if (attempt.finalStatus !== "SUCCESS" && attempt.finalStatus !== "FAILED") {
      if (attempt.signedXdr) {
        attempt = (await checkOnce(deps, attempt)).row;
      } else if (attempt.expiresAt && deps.now() > Date.parse(attempt.expiresAt)) {
        await deps.db.markExpiredUnsigned(attempt.id);
        attempt = (await deps.db.getAttempt(attempt.id)) ?? attempt;
      }
    }
    summary.attemptState = attempt.state;
    summary.finalStatus = attempt.finalStatus;
    if (attempt.finalStatus !== "SUCCESS") return summary; // FAILED or unresolved: nothing to verify

    // Envelopes cannot change after payment; refuse to verify against another version.
    if (attempt.planVersionId && attempt.planVersionId !== context.value.versionId) {
      const review = await deps.db.openOperatorReview({ scope: "verification", refId: attempt.id, reason: "Paid version differs from the current plan version." });
      return { ...summary, reviewOpened: review.ok };
    }

    // 2. Events for this transaction.
    const ingest = await ingestEvents(deps, { deploymentId: attempt.deploymentId, holder, txHash: originalTxHash });
    if (ingest.status === "rate_limited") summary.retryAfterSeconds = ingest.retryAfterSeconds;
    const events = await deps.db.listStoredEvents({ deploymentId: attempt.deploymentId, txHash: originalTxHash });

    // 3. Receipt and per-envelope payout checks.
    const txStatus = {
      kind: "found" as const,
      txHash: originalTxHash,
      network: attempt.network ?? "testnet",
      status: "SUCCESS" as const,
      ledger: attempt.ledger,
    };
    const receipt = verifyPaymentReceipt({
      originalTxHash: originalTxHash,
      txStatus,
      events,
      signerAddress: context.value.signerAddress,
      totalStroops: context.value.totalStroops,
    });
    await deps.db.recordPaymentReceiptVerification({ attemptId: attempt.id, result: receipt });
    summary.receipt = receipt.state;

    const distribution = verifyDistribution({
      originalTxHash: originalTxHash,
      txStatus,
      events,
      totalStroops: context.value.totalStroops,
      envelopes: context.value.envelopes.map((e) => ({ position: e.position, bps: e.bps, recipientAddress: e.recipientAddress })),
      shape: options.payoutShape,
    });
    for (const { position, result } of distribution.results)
      await deps.db.recordEnvelopePayoutVerification({ planId, attemptId: attempt.id, envelopePosition: position, result });
    summary.payouts = { verified: distribution.verified, total: distribution.total };

    // 4. Evidence still missing after the threshold goes to an operator. The
    // clock starts at attempt creation, since status checks touch updatedAt.
    const since = Date.parse(attempt.createdAt);
    const stale = Number.isFinite(since) && deps.now() - since > PAYOUT_EVIDENCE_THRESHOLD_SECONDS * 1_000;
    const missing = receipt.state !== "verified" || !distribution.allVerified;
    if (missing && stale && !distribution.anyMismatch) {
      const review = await deps.db.openOperatorReview({
        scope: "verification",
        refId: attempt.id,
        reason: "Payment confirmed but payout evidence is still missing after the threshold.",
      });
      summary.reviewOpened = review.ok;
    }
    return summary;
  } finally {
    await deps.db.releaseReconcileLease(leaseKey, holder);
  }
}
