import { describe, expect, it, vi } from "vitest";
import { Asset, Networks } from "@stellar/stellar-sdk";

vi.mock("server-only", () => ({}));

import {
  PAY_PAYOUT_SHAPE,
  verifyDistribution,
  verifyEnvelopePayout,
  verifyPaymentReceipt,
  type PaiflowEventRecord,
  type PayoutEventShape,
  type TxStatusEvidence,
} from "@/server/paiflow/verify";

// Fixture provenance: event kinds, topics and field names follow the Paiflow
// source-code reading in CARLOS-PHASETASK §2 (RECEIVE/deposit {from, amount,
// asset}; PAYOUT/pay {recipient, asset, payment}). The Split payout shape is a
// test-only assumption until C-02(c) records the real payload.
const original = "a".repeat(64);
const signer = `G${"S".repeat(54)}2`;
const ops = `G${"A".repeat(54)}2`;
const payroll = `G${"B".repeat(54)}2`;
const supplies = `G${"C".repeat(54)}2`;
const success: TxStatusEvidence = {
  kind: "found",
  txHash: original,
  network: "testnet",
  status: "SUCCESS",
  ledger: 42,
};

let n = 0;
function event(kind: string, topic: string | null, data: unknown, txHash = original): PaiflowEventRecord {
  n += 1;
  return { eventId: `evt-${n}`, id: `${n}`, kind, topic, ledger: 42, txHash, occurredAt: "2026-10-25T05:00:00Z", data };
}
const deposit = (data: Record<string, unknown> = {}) =>
  event("RECEIVE", "deposit", { from: signer, amount: "10000000", asset: "XLM", ...data });
const payout = (recipient: string, payment: string | number, asset: unknown = "XLM") =>
  event("PAYOUT", "pay", { recipient, payment, asset });

const receipt = (txStatus: TxStatusEvidence, events: PaiflowEventRecord[]) =>
  verifyPaymentReceipt({ originalTxHash: original, txStatus, events, signerAddress: signer, totalStroops: "10000000" });

describe("payment receipt (H.1 + H.2)", () => {
  it("passes for a SUCCESS original with a matching deposit", () => {
    const v = receipt(success, [deposit()]);
    expect(v.state).toBe("verified");
    expect(Object.values(v.checks).every((c) => c === "pass")).toBe(true);
    expect(v.observedAmountStroops).toBe("10000000");
  });

  it("accepts the native asset contract address", () => {
    const contract = Asset.native().contractId(Networks.TESTNET);
    expect(receipt(success, [deposit({ asset: contract })]).state).toBe("verified");
  });

  it.each<[string, TxStatusEvidence, string]>([
    ["not checked", { kind: "not_checked" }, "not_started"],
    ["404", { kind: "not_found" }, "awaiting_tx_final"],
    ["PENDING", { ...success, status: "PENDING" } as TxStatusEvidence, "awaiting_tx_final"],
    ["UNKNOWN", { ...success, status: "UNKNOWN" } as TxStatusEvidence, "awaiting_tx_final"],
    ["FAILED", { ...success, status: "FAILED" } as TxStatusEvidence, "mismatch"],
    ["another hash", { ...success, txHash: "b".repeat(64) }, "mismatch"],
    ["mainnet", { ...success, network: "mainnet" }, "mismatch"],
  ])("finality: %s is never verified", (_, txStatus, state) => {
    const v = receipt(txStatus, [deposit()]);
    expect(v.state).toBe(state);
    expect(v.state).not.toBe("verified");
  });

  it("waits when the deposit event is not indexed", () => {
    expect(receipt(success, []).state).toBe("awaiting_events");
    expect(receipt(success, [{ ...deposit(), txHash: "c".repeat(64) }]).state).toBe("awaiting_events");
  });

  it.each([
    ["another payer", { from: payroll }, "party"],
    ["a smaller amount", { amount: "9999999" }, "amount"],
    ["a larger amount", { amount: "10000001" }, "amount"],
    ["another asset", { asset: "USDC" }, "asset"],
  ])("flags a deposit from %s as mismatch", (_, data, check) => {
    const v = receipt(success, [deposit(data)]);
    expect(v.state).toBe("mismatch");
    expect(v.checks[check as keyof typeof v.checks]).toBe("fail");
  });

  it("never passes a deposit with missing fields", () => {
    const v = receipt(success, [event("RECEIVE", "deposit", { from: signer, amount: "10000000" })]);
    expect(v.state).toBe("awaiting_events");
    expect(v.checks.asset).toBe("pending");
    expect(receipt(success, [event("RECEIVE", "deposit", null)]).state).toBe("awaiting_events");
  });

  it("compares amounts as exact integer strings", () => {
    expect(receipt(success, [deposit({ amount: "1.0" })]).state).toBe("awaiting_events");
    expect(receipt(success, [deposit({ amount: 10000000 })]).state).toBe("verified");
  });
});

const envelope = (events: PaiflowEventRecord[], extra: Partial<Parameters<typeof verifyEnvelopePayout>[0]> = {}) =>
  verifyEnvelopePayout({
    originalTxHash: original,
    txStatus: success,
    events,
    recipientAddress: ops,
    expectedShareStroops: "5000000",
    shape: PAY_PAYOUT_SHAPE,
    ...extra,
  });

describe("envelope payout (H.5)", () => {
  it("passes for an exact payout to the registered address", () => {
    const v = envelope([payout(ops, "5000000")]);
    expect(v.state).toBe("verified");
    expect(v.eventIds).toHaveLength(1);
  });

  it.each([
    ["shortfall", "4999999"],
    ["surplus", "5000001"],
  ])("records a %s as mismatch with both values", (_, amount) => {
    const v = envelope([payout(ops, amount)]);
    expect(v.state).toBe("mismatch");
    expect(v.expectedAmountStroops).toBe("5000000");
    expect(v.observedAmountStroops).toBe(amount);
  });

  it("flags a payout in another asset", () => {
    expect(envelope([payout(ops, "5000000", "USDC")]).state).toBe("mismatch");
  });

  it("ignores payouts to other envelopes and other transactions", () => {
    expect(envelope([payout(payroll, "5000000")]).state).toBe("awaiting_events");
    expect(envelope([{ ...payout(ops, "5000000"), txHash: "d".repeat(64) }]).state).toBe("awaiting_events");
  });

  it("never passes a payout with a missing amount or asset", () => {
    expect(envelope([event("PAYOUT", "pay", { recipient: ops, asset: "XLM" })]).state).toBe("awaiting_events");
    expect(envelope([event("PAYOUT", "pay", { recipient: ops, payment: "5000000" })]).state).toBe("awaiting_events");
  });

  it("stays pending while the Split payout shape is unknown (B-04)", () => {
    const v = envelope([payout(ops, "5000000")], { shape: undefined });
    expect(v.state).toBe("awaiting_events");
    expect(v.note).toContain("B-04");
    expect(Object.values(v.checks)).not.toContain("fail");
    expect(v.checks.amount).toBe("pending");
  });

  it("does not verify a payout before the original transaction is SUCCESS", () => {
    expect(envelope([payout(ops, "5000000")], { txStatus: { ...success, status: "PENDING" } }).state).toBe(
      "awaiting_tx_final",
    );
  });
});

describe("distribution", () => {
  const envelopes = [
    { position: 0, bps: 5000, recipientAddress: ops },
    { position: 1, bps: 3000, recipientAddress: payroll },
    { position: 2, bps: 2000, recipientAddress: supplies },
  ];
  const run = (events: PaiflowEventRecord[], totalStroops = "10000000", shape: PayoutEventShape | null = PAY_PAYOUT_SHAPE) =>
    verifyDistribution({ originalTxHash: original, txStatus: success, events, totalStroops, envelopes, shape });

  it("verifies 5,000,000 / 3,000,000 / 2,000,000 stroops for 1 XLM", () => {
    const d = run([payout(ops, "5000000"), payout(payroll, "3000000"), payout(supplies, "2000000")]);
    expect(d.results.map((r) => r.result.expectedAmountStroops)).toEqual(["5000000", "3000000", "2000000"]);
    expect(d).toMatchObject({ verified: 3, total: 3, allVerified: true, anyMismatch: false });
  });

  it("never treats 2 of 3 verified as a verified distribution", () => {
    const d = run([payout(ops, "5000000"), payout(payroll, "3000000")]);
    expect(d).toMatchObject({ verified: 2, total: 3, allVerified: false });
    expect(d.results[2].result.state).toBe("awaiting_events");
  });

  it("puts the rounding remainder on the last envelope", () => {
    const d = run([payout(ops, "5000000"), payout(payroll, "3000000"), payout(supplies, "2000001")], "10000001");
    expect(d.results[2].result.expectedAmountStroops).toBe("2000001");
    expect(d.allVerified).toBe(true);
  });

  it("verifies each envelope independently and reports a mismatch", () => {
    const d = run([payout(ops, "5000000"), payout(payroll, "2999999"), payout(supplies, "2000000")]);
    expect(d.results.map((r) => r.result.state)).toEqual(["verified", "mismatch", "verified"]);
    expect(d).toMatchObject({ allVerified: false, anyMismatch: true });
  });

  it("keeps every envelope pending without a recorded Split shape", () => {
    const d = run([payout(ops, "5000000"), payout(payroll, "3000000"), payout(supplies, "2000000")], "10000000", null);
    expect(d.verified).toBe(0);
    expect(d.allVerified).toBe(false);
  });
});
