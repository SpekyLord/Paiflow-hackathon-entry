import "server-only";
import { Networks } from "@stellar/stellar-sdk";
import type { PaymentAttemptViewDTO, PaymentReviewDTO } from "@/contracts/dto";
import type { ErrorCode } from "@/contracts/errors";
import { MAX_PAY_SUBMIT_BODY_BYTES, MAX_SIGNED_XDR_CHARS } from "@/contracts/limits";
import { splitShares } from "@/contracts/split";
import type { PaymentAttemptRow, PaymentContext, PayScope, SubmissionOutcome } from "@/server/db/financial-core";
import { toAttemptView } from "@/server/paiflow/attempt-view";
import { callPaiflow, requireSession, type PaymentDeps, type RouteSession } from "@/server/paiflow/deps";
import { SafePaiflowError } from "@/server/paiflow/errors";
import { fail, readJson, requireSameOrigin, requireUuid, RouteError } from "@/server/paiflow/route-kit";
import { checkOnce } from "@/server/paiflow/status";
import { envelopeHash, feeStroops, inspectEnvelope, isSignedBy } from "@/lib/stellar/envelope";

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

async function loadAttempt(deps: PaymentDeps, attemptId: string, planId: string) {
  const attempt = await deps.db.getAttempt(attemptId);
  if (!attempt || attempt.budgetPlanId !== planId) return fail("NOT_FOUND");
  return attempt;
}

// Submits signed bytes and records the response. Any SDK failure is an
// unknown outcome (transport_error), never a failure, and is never retried.
async function submitAndRecord(deps: PaymentDeps, attempt: PaymentAttemptRow, signedXdr: string) {
  let outcome: SubmissionOutcome;
  let requestId: string | null;
  try {
    const res = await callPaiflow(() =>
      deps.paiflow(attempt.deploymentId).execute.submit(
        { signedXdr },
        { wait: false, preparationRequestId: attempt.historyRequestId ?? undefined },
      ),
    );
    const d = res.data;
    if (d.txHash !== attempt.originalTxHash)
      console.error("[payments] submit returned a different hash; keeping the original", attempt.id);
    outcome = { kind: "response", status: d.status, txHash: d.txHash, ledger: d.ledger ?? null, errorCode: d.error?.code ?? null };
    requestId = res.metadata.requestId ?? null;
  } catch (error) {
    const safe = error as SafePaiflowError;
    outcome = { kind: "transport_error", httpStatus: safe.upstreamStatus, code: safe.upstreamCode ?? safe.code };
    requestId = safe.requestId;
  }
  const recorded = await deps.db.recordSubmission({ attemptId: attempt.id, requestId, outcome });
  return recorded.ok ? recorded.value : attempt;
}

export async function submitPaymentHandler(deps: PaymentDeps, request: Request, params: PlanParams): Promise<PaymentAttemptViewDTO> {
  requireSameOrigin(request);
  const session = await requireSession(deps, request);
  deps.rateLimit("submit", session.userId);
  const body = await readJson(request, MAX_PAY_SUBMIT_BODY_BYTES);
  const attemptId = requireUuid(body.attemptId, "attempt");
  const signedXdr = body.signedXdr;
  if (typeof signedXdr !== "string" || signedXdr.length === 0) return fail("VALIDATION_SHAPE", "signedXdr is required.");
  if (signedXdr.length > MAX_SIGNED_XDR_CHARS) fail("REQUEST_TOO_LARGE");

  const { context } = await loadContext(deps, session, params);
  requireSigner(session, context);
  const attempt = await loadAttempt(deps, attemptId, params.planId);
  if (!attempt.originalTxHash || !attempt.preparedXdr) fail("STATE_CONFLICT", "This payment was not prepared.");
  if (attempt.signedXdr) fail("ATTEMPT_UNRESOLVED", "A signed envelope is already stored. Check the original transaction.");

  // Rejected envelopes are kept as evidence; the attempt state is unchanged.
  const reject = async (reason: "BODY_CHANGED" | "FEE_BUMP" | "WRONG_SIGNER" | "UNPARSEABLE", code: ErrorCode, message?: string) => {
    await deps.db.recordEnvelopeRejection({ attemptId, actorUserId: session.userId, signedXdr, reason });
    return fail(code, message);
  };
  const inspected = inspectEnvelope(signedXdr);
  if (inspected.kind === "unparseable") return reject("UNPARSEABLE", "VALIDATION", "The signed transaction could not be read.");
  if (inspected.kind === "fee_bump") return reject("FEE_BUMP", "ENVELOPE_CHANGED", "Fee-bump envelopes are not accepted.");
  if (inspected.hash !== attempt.originalTxHash)
    return reject("BODY_CHANGED", "ENVELOPE_CHANGED", "The wallet changed the transaction. Nothing was submitted; keep this record.");
  if (!isSignedBy(signedXdr, context.signerAddress)) return reject("WRONG_SIGNER", "SIGNATURE_INVALID");

  // Persist the signed envelope BEFORE submitting it.
  const persisted = unwrap(
    await deps.db.persistSignedEnvelope({
      attemptId,
      actorUserId: session.userId,
      signedXdr,
      signedBodyHash: inspected.hash,
      receivedAfterExpiry: attempt.expiresAt !== null && deps.now() > Date.parse(attempt.expiresAt),
    }),
  );
  const submitted = await submitAndRecord(deps, persisted, signedXdr);
  const { row } = await checkOnce(deps, submitted);
  return toAttemptView(row);
}
