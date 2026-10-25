import "server-only";
import { Networks } from "@stellar/stellar-sdk";
import type { PaymentReviewDTO } from "@/contracts/dto";
import { splitShares } from "@/contracts/split";
import type { PaymentAttemptRow, PaymentContext, PayScope } from "@/server/db/financial-core";
import { callPaiflow, requireSession, type PaymentDeps, type RouteSession } from "@/server/paiflow/deps";
import { SafePaiflowError } from "@/server/paiflow/errors";
import { fail, requireSameOrigin, requireUuid, RouteError } from "@/server/paiflow/route-kit";
import { envelopeHash, feeStroops } from "@/lib/stellar/envelope";

// Budget-plan Split payment routes (C-07…C-09). Order matters and is tested:
// the approval gate runs before any Paiflow call, and every Paiflow result is
// persisted before the browser sees it.

export interface PlanParams {
  orgId: string;
  planId: string;
}

const unwrap = <T>(r: { ok: true; value: T } | { ok: false; code: Parameters<typeof fail>[0] }): T => {
  if (!r.ok) throw new RouteError(r.code);
  return r.value;
};

// Loads the plan context for this actor and checks the route's org matches.
export async function loadContext(deps: PaymentDeps, session: RouteSession, params: PlanParams) {
  requireUuid(params.orgId, "organisation");
  requireUuid(params.planId, "plan");
  const scope: PayScope = { kind: "plan", planId: params.planId };
  const context = unwrap(await deps.db.getPaymentContext(scope, session.userId));
  if (context.orgId !== params.orgId) fail("NOT_FOUND");
  return { scope, context };
}

// Application control (CL-15): only the plan's signer, with the bound wallet.
export function requireSigner(session: RouteSession, context: PaymentContext) {
  if (context.signerUserId !== session.userId) fail("NOT_SIGNER");
  if (context.viewerBinding?.address !== context.signerAddress) fail("WALLET_MISMATCH");
}

function toReview(row: PaymentAttemptRow, context: PaymentContext, outcome: "created" | "existing"): PaymentReviewDTO {
  return {
    attemptId: row.id,
    network: "testnet",
    networkPassphrase: Networks.TESTNET,
    xdr: row.preparedXdr!,
    originalTxHash: row.originalTxHash!,
    expiresAt: row.expiresAt!,
    amountStroops: context.totalStroops,
    asset: context.asset,
    feeStroops: row.feeStroops,
    deploymentId: context.deploymentId,
    recipients: [...context.envelopes]
      .sort((a, b) => a.position - b.position)
      .map((e) => ({ label: e.label, address: e.recipientAddress, expectedShareStroops: e.expectedShareStroops })),
    outcome,
  };
}

// CL-06: a repeated prepare returns the same unexpired XDR to its signer.
async function existingReview(deps: PaymentDeps, attempt: PaymentAttemptRow, context: PaymentContext) {
  const reusable =
    (attempt.state === "prepared" || attempt.state === "signing") &&
    attempt.preparedXdr && attempt.originalTxHash && attempt.expiresAt && !attempt.signedXdr;
  if (!reusable) fail("ATTEMPT_UNRESOLVED", "A payment for this plan is already in progress. Check the original transaction.");
  if (deps.now() >= Date.parse(attempt.expiresAt!)) {
    await deps.db.markExpiredUnsigned(attempt.id);
    fail("ATTEMPT_UNRESOLVED", "The prepared payment expired unsigned. It is under review; do not pay again.");
  }
  unwrap(await deps.db.markSignatureRequested(attempt.id));
  return toReview(attempt, context, "existing");
}

function sharesMatch(context: PaymentContext) {
  const shares = splitShares(context.totalStroops, context.envelopes);
  return context.envelopes.every(
    (e) => shares.find((s) => s.position === e.position)?.shareStroops === e.expectedShareStroops,
  );
}

export async function preparePaymentHandler(deps: PaymentDeps, request: Request, params: PlanParams): Promise<PaymentReviewDTO> {
  requireSameOrigin(request);
  const session = await requireSession(deps, request);
  deps.rateLimit("prepare", session.userId);
  const { scope, context: viewed } = await loadContext(deps, session, params);
  requireSigner(session, viewed);

  // REQ-BUD-02 AC4: the SQL gate refuses an unapproved plan; Paiflow is never called.
  const { outcome, attempt, context } = unwrap(await deps.db.beginPaymentAttempt({ scope, actorUserId: session.userId }));
  if (outcome === "existing") return existingReview(deps, attempt, context);

  const abort = async (code: string, requestId: string | null = null) =>
    deps.db.failPreparation({ attemptId: attempt.id, code, requestId });
  if (!sharesMatch(context)) {
    await abort("SHARES_MISMATCH");
    fail("ENVELOPES_MISMATCH_DEPLOYMENT");
  }

  let prepared;
  try {
    prepared = await callPaiflow(() =>
      deps.paiflow(context.deploymentId).execute.prepare({ from: context.signerAddress, amount: context.totalStroops }),
    );
  } catch (error) {
    // Nothing was signed or broadcast, so a failed prepare is safe to close.
    const safe = error as SafePaiflowError;
    await abort(safe.code, safe.requestId);
    throw error;
  }

  const p = prepared.data;
  if (p.network !== "testnet" || p.networkPassphrase !== Networks.TESTNET || !(Date.parse(p.expiresAt) > deps.now())) {
    await abort("NOT_TESTNET_OR_EXPIRED");
    fail("CAPABILITY_MISMATCH", "Paiflow did not prepare a valid Testnet payment.");
  }
  let originalTxHash: string;
  let fee: string;
  try {
    originalTxHash = envelopeHash(p.xdr);
    fee = feeStroops(p.xdr);
  } catch {
    await abort("UNUSABLE_ENVELOPE");
    return fail("VALIDATION", "Paiflow returned an envelope CYFER cannot accept.");
  }

  // Persist the preparation before the XDR leaves the server.
  const recorded = await deps.db.recordPreparation({
    attemptId: attempt.id,
    network: "testnet",
    networkPassphrase: p.networkPassphrase,
    preparedXdr: p.xdr,
    originalTxHash,
    historyRequestId: prepared.metadata.historyRequestId ?? null,
    expiresAt: p.expiresAt,
    feeStroops: fee,
  });
  if (!recorded.ok) {
    await abort("RECORD_FAILED");
    throw new RouteError(recorded.code);
  }
  unwrap(await deps.db.markSignatureRequested(attempt.id));
  return toReview(recorded.value, context, "created");
}
