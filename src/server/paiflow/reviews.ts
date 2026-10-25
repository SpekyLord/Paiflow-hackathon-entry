import "server-only";
import type { OperatorReviewDTO } from "@/contracts/dto";
import type { ReviewResolution } from "@/server/db/financial-core";
import type { PaymentDeps } from "@/server/paiflow/deps";
import { requireOperator } from "@/server/paiflow/deployments";
import { fail, readJson, requireSameOrigin, requireUuid, RouteError, TX_HASH } from "@/server/paiflow/route-kit";

// C-16 (PRD §D.1 Operator, §G.4 NOT_FOUND): operators list and resolve
// reviews with a mandatory justification and evidence. Resolving only
// records a decision through Francis's RPC; no outcome prepares, submits or
// releases a payment.

const OUTCOMES: readonly ReviewResolution[] = [
  "payment_success_confirmed",
  "payment_failed_confirmed",
  "not_broadcast_ledger_proven",
  "payout_confirmed",
  "refund_confirmed",
  "release_retry_authorised",
  "no_action",
];
const MAX_TEXT = 2_000;

export async function listReviewsHandler(deps: PaymentDeps, request: Request): Promise<OperatorReviewDTO[]> {
  await requireOperator(deps, request);
  return deps.db.listOperatorReviews();
}

export async function resolveReviewHandler(deps: PaymentDeps, request: Request, reviewId: string): Promise<OperatorReviewDTO> {
  requireSameOrigin(request);
  const session = await requireOperator(deps, request);
  const id = requireUuid(reviewId, "review");
  const body = await readJson(request);

  const outcome = body.outcome as ReviewResolution;
  if (!OUTCOMES.includes(outcome)) fail("VALIDATION", "Unknown review outcome.");
  // release_retry_authorised belongs to the SHOULD protected payment (C-32).
  if (outcome === "release_retry_authorised") fail("VALIDATION", "Release retries are not part of the MVP.");
  const justification = typeof body.justification === "string" ? body.justification.trim() : "";
  if (!justification || justification.length > MAX_TEXT) fail("VALIDATION", "A justification is required.");

  const raw = (body.evidence ?? {}) as Record<string, unknown>;
  if (typeof raw !== "object" || Array.isArray(raw)) fail("VALIDATION", "Evidence is required.");
  const notes = typeof raw.notes === "string" ? raw.notes.trim() : "";
  if (notes.length > MAX_TEXT) fail("VALIDATION", "Evidence notes are too long.");
  const evidence: { notes: string; stellarTxHash?: string; explorerCheckedAt?: string } = { notes };
  if (raw.stellarTxHash !== undefined) {
    if (typeof raw.stellarTxHash !== "string" || !TX_HASH.test(raw.stellarTxHash)) fail("VALIDATION", "Invalid Stellar transaction hash.");
    evidence.stellarTxHash = raw.stellarTxHash as string;
  }
  if (raw.explorerCheckedAt !== undefined) {
    if (typeof raw.explorerCheckedAt !== "string" || !Number.isFinite(Date.parse(raw.explorerCheckedAt))) fail("VALIDATION", "Invalid explorer check time.");
    evidence.explorerCheckedAt = raw.explorerCheckedAt as string;
  }
  // Confirming an on-chain outcome needs the hash that was checked.
  if (outcome !== "no_action" && outcome !== "not_broadcast_ledger_proven" && !evidence.stellarTxHash)
    fail("VALIDATION", "Record the Stellar transaction hash you checked.");

  const result = await deps.db.resolveOperatorReview({ reviewId: id, operatorUserId: session.userId, outcome, justification, evidence });
  if (!result.ok) throw new RouteError(result.code);
  const review = (await deps.db.listOperatorReviews()).find((r) => r.reviewId === id);
  return review ?? fail("NOT_FOUND");
}
