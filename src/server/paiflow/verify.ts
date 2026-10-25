import "server-only";
import type { AssetRef, GAddress } from "@/contracts/dto";
import type { VerificationState } from "@/contracts/states";
import { splitShares } from "@/contracts/split";
import { matchesNativeAsset } from "@/lib/stellar/asset";

// Pure payment-receipt (PRD §H.1 + §H.2) and per-envelope Split payout (§H.5)
// checks. They only read evidence passed in; recording it is Francis's
// recordPaymentReceiptVerification / recordEnvelopePayoutVerification (§3.6).
// A missing field is never a pass, and missing events never mean "failed".

export type CheckName =
  | "finality"
  | "originalHash"
  | "deployment"
  | "network"
  | "event"
  | "party"
  | "asset"
  | "amount"
  | "direction";
export type CheckResult = "pass" | "fail" | "pending";

// Mirrors VerificationInput in FRANCIS-PHASETASK §3.6.
export interface VerificationInput {
  state: VerificationState;
  stellarTxHash: string | null;
  expectedAddress: GAddress;
  expectedAmountStroops: string;
  observedAmountStroops: string | null;
  asset: AssetRef;
  eventIds: string[];
  checks: Record<CheckName, CheckResult>;
  note: string | null;
}

// Mirrors PaiflowEventRecord in FRANCIS-PHASETASK §3.6.
export interface PaiflowEventRecord {
  eventId: string;
  id: string;
  kind: string;
  topic: string | null;
  ledger: number;
  txHash: string;
  occurredAt: string;
  data: unknown;
}

// Result of transactions.get(originalTxHash) on the plan's deployment.
export type TxStatusEvidence =
  | {
      kind: "found";
      txHash: string;
      network: string;
      status: "SUCCESS" | "FAILED" | "PENDING" | "UNKNOWN" | "REJECTED";
      ledger: number | null;
    }
  | { kind: "not_found" }
  | { kind: "not_checked" };

// Where a payout event keeps its recipient, amount and asset.
export interface PayoutEventShape {
  kind: string;
  topic: string | null;
  recipientField: string;
  amountField: string;
  assetField: string | null;
  provenance: "docs" | "source" | "recorded";
}

// Pay-flow payout as read from Paiflow source code (not a published contract).
export const PAY_PAYOUT_SHAPE: PayoutEventShape = {
  kind: "PAYOUT",
  topic: "pay",
  recipientField: "recipient",
  amountField: "payment",
  assetField: "asset",
  provenance: "source",
};

// B-04: the Split payout topic and fields were not found in any source. Until
// the R1 rehearsal records them (C-02(c)), envelope checks stay pending.
export const SPLIT_PAYOUT_SHAPE: PayoutEventShape | null = null;

const NATIVE: AssetRef = { kind: "native" };

const pendingChecks = (): Record<CheckName, CheckResult> => ({
  finality: "pending",
  originalHash: "pending",
  deployment: "pending",
  network: "pending",
  event: "pending",
  party: "pending",
  asset: "pending",
  amount: "pending",
  direction: "pending",
});

interface Base {
  originalTxHash: string;
  txStatus: TxStatusEvidence;
  events: readonly PaiflowEventRecord[];
}

export function verifyPaymentReceipt(
  input: Base & { signerAddress: GAddress; totalStroops: string },
): VerificationInput {
  const result = start(input, input.signerAddress, input.totalStroops);
  if (result.done) return result.value;
  const v = result.value;

  const receipts = input.events.filter(
    (e) => e.txHash === input.originalTxHash && e.kind === "RECEIVE" && e.topic === "deposit",
  );
  if (receipts.length === 0)
    return { ...v, state: "awaiting_events", note: "Transaction confirmed; deposit event not yet indexed." };
  v.checks.event = "pass";
  v.checks.direction = "pass";

  let firstMismatch: VerificationInput | null = null;
  for (const event of receipts) {
    const data = record(event.data);
    const from = data.from;
    const amount = readAmount(data.amount);
    const assetOk = "asset" in data ? matchesNativeAsset(data.asset) : null;
    const checks = {
      ...v.checks,
      party: from === undefined ? "pending" : from === input.signerAddress ? "pass" : "fail",
      amount: amount === null ? "pending" : amount === input.totalStroops ? "pass" : "fail",
      asset: assetOk === null ? "pending" : assetOk ? "pass" : "fail",
    } satisfies Record<CheckName, CheckResult>;
    const candidate: VerificationInput = {
      ...v,
      checks,
      observedAmountStroops: amount,
      eventIds: [event.eventId],
    };
    const values = Object.values(checks);
    if (values.every((c) => c === "pass")) return { ...candidate, state: "verified", note: null };
    if (values.includes("fail")) firstMismatch ??= { ...candidate, state: "mismatch", note: "Deposit does not match the signer, amount or asset." };
  }
  return (
    firstMismatch ?? {
      ...v,
      state: "awaiting_events",
      eventIds: receipts.map((e) => e.eventId),
      note: "Deposit event is missing a required field.",
    }
  );
}

export function verifyEnvelopePayout(
  input: Base & {
    recipientAddress: GAddress;
    expectedShareStroops: string;
    shape?: PayoutEventShape | null;
  },
): VerificationInput {
  const result = start(input, input.recipientAddress, input.expectedShareStroops);
  if (result.done) return result.value;
  const v = result.value;
  const shape = input.shape === undefined ? SPLIT_PAYOUT_SHAPE : input.shape;
  if (!shape)
    return {
      ...v,
      state: "awaiting_events",
      note: "Split payout event shape not yet recorded (B-04); payout stays pending.",
    };

  const payouts = input.events.filter(
    (e) =>
      e.txHash === input.originalTxHash &&
      e.kind === shape.kind &&
      (shape.topic === null || e.topic === shape.topic) &&
      record(e.data)[shape.recipientField] === input.recipientAddress,
  );
  if (payouts.length === 0)
    return { ...v, state: "awaiting_events", note: "Payout event to this envelope not yet indexed." };
  v.checks.event = "pass";
  v.checks.party = "pass";
  v.checks.direction = "pass";
  v.eventIds = payouts.map((e) => e.eventId);

  let observed = BigInt(0);
  for (const event of payouts) {
    const data = record(event.data);
    const amount = readAmount(data[shape.amountField]);
    if (amount === null)
      return { ...v, state: "awaiting_events", note: "Payout event is missing its amount." };
    observed += BigInt(amount);
    if (shape.assetField) {
      if (!(shape.assetField in data))
        return { ...v, state: "awaiting_events", note: "Payout event is missing its asset." };
      if (!matchesNativeAsset(data[shape.assetField])) v.checks.asset = "fail";
    }
  }
  if (!shape.assetField) v.checks.asset = "pending";
  else if (v.checks.asset !== "fail") v.checks.asset = "pass";
  v.observedAmountStroops = observed.toString();
  v.checks.amount = observed.toString() === input.expectedShareStroops ? "pass" : "fail";

  if (v.checks.asset === "fail" || v.checks.amount === "fail")
    return {
      ...v,
      state: "mismatch",
      note: `Expected ${input.expectedShareStroops} stroops, observed ${observed.toString()}.`,
    };
  if (v.checks.asset === "pending")
    return { ...v, state: "awaiting_events", note: "Payout asset could not be confirmed." };
  return { ...v, state: "verified", note: null };
}

export interface DistributionEnvelope {
  position: number;
  bps: number;
  recipientAddress: GAddress;
}

// Verifies each envelope on its own. "2 of 3 verified" is never a verified
// distribution: allVerified needs every envelope verified.
export function verifyDistribution(
  input: Base & {
    totalStroops: string;
    envelopes: readonly DistributionEnvelope[];
    shape?: PayoutEventShape | null;
  },
) {
  const byPosition = new Map(input.envelopes.map((e) => [e.position, e]));
  const results = splitShares(input.totalStroops, input.envelopes).map((share) => {
    const envelope = byPosition.get(share.position)!;
    return {
      position: share.position,
      result: verifyEnvelopePayout({
        originalTxHash: input.originalTxHash,
        txStatus: input.txStatus,
        events: input.events,
        recipientAddress: envelope.recipientAddress,
        expectedShareStroops: share.shareStroops,
        shape: input.shape,
      }),
    };
  });
  const verified = results.filter((r) => r.result.state === "verified").length;
  return {
    results,
    verified,
    total: results.length,
    allVerified: verified === results.length,
    anyMismatch: results.some((r) => r.result.state === "mismatch"),
  };
}

// Shared H.1 checks: the original transaction is final, attributed to the
// deployment, on Testnet and SUCCESS.
function start(
  input: Base,
  expectedAddress: GAddress,
  expectedAmountStroops: string,
): { done: true; value: VerificationInput } | { done: false; value: VerificationInput } {
  const v: VerificationInput = {
    state: "awaiting_tx_final",
    stellarTxHash: input.originalTxHash,
    expectedAddress,
    expectedAmountStroops,
    observedAmountStroops: null,
    asset: NATIVE,
    eventIds: [],
    checks: pendingChecks(),
    note: null,
  };
  const tx = input.txStatus;
  if (tx.kind === "not_checked")
    return { done: true, value: { ...v, state: "not_started", note: "Transaction status not checked yet." } };
  if (tx.kind === "not_found")
    return { done: true, value: { ...v, note: "Paiflow has no record of this hash yet; this does not prove it failed." } };
  v.checks.deployment = "pass";
  v.checks.originalHash = tx.txHash === input.originalTxHash ? "pass" : "fail";
  v.checks.network = tx.network === "testnet" ? "pass" : "fail";
  if (v.checks.originalHash === "fail" || v.checks.network === "fail")
    return { done: true, value: { ...v, state: "mismatch", note: "Status evidence does not match the original Testnet transaction." } };
  if (tx.status === "FAILED") {
    v.checks.finality = "fail";
    return { done: true, value: { ...v, state: "mismatch", note: "Transaction FAILED; nothing was paid." } };
  }
  if (tx.status !== "SUCCESS")
    return { done: true, value: { ...v, note: `Transaction status ${tx.status}; waiting for a final result.` } };
  v.checks.finality = "pass";
  return { done: false, value: v };
}

function record(data: unknown): Record<string, unknown> {
  return data && typeof data === "object" && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

// Event amounts must be positive integer stroops; anything else is unreadable.
function readAmount(value: unknown): string | null {
  if (typeof value === "string" && /^[1-9][0-9]{0,38}$/.test(value)) return value;
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return String(value);
  return null;
}
