import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { reconcilePlan } from "@/server/paiflow/reconcile";
import { verifyDistribution, type PaiflowEventRecord, type TxStatusEvidence } from "@/server/paiflow/verify";
import { readTxCredits } from "@/server/wallet-summary/horizon";
import { context, makeHarness, ok, PLAN, sdk, SIGNER, USER, attemptRow } from "./harness";

// Fixture provenance (HO-04): shapes recorded from the live Split deployment
// f0876746-ce2b-44cc-8e94-cb3bb00a807f, tx c78516f3...bde464 (SUCCESS, ledger
// 5377166). RECEIVE/deposit {from, asset:"XLM", amount:"10000000"}; ONE
// PAYOUT/payout event {from:<C…>, recipients:[{bps, amount:"0", address,
// is_cash_out:false} x3]}; Horizon effects credit 0.5/0.3/0.2 native.
// Addresses are test values; the shape and amounts are the recorded ones.
const tx = "c78516f3eb47971baa67558c6ce048cca9227433d14613dda90f346446bde464";
const ops = `G${"A".repeat(54)}2`;
const payroll = `G${"B".repeat(54)}2`;
const supplies = `G${"C".repeat(54)}2`;
const contract = `C${"D".repeat(54)}2`;
const success: TxStatusEvidence = { kind: "found", txHash: tx, network: "testnet", status: "SUCCESS", ledger: 5377166 };
const envelopes = [
  { position: 0, bps: 5000, recipientAddress: ops },
  { position: 1, bps: 3000, recipientAddress: payroll },
  { position: 2, bps: 2000, recipientAddress: supplies },
];
const recipients = (list = envelopes) =>
  list.map((e) => ({ bps: e.bps, amount: "0", address: e.recipientAddress, is_cash_out: false }));
const payoutEvent = (data: unknown = { from: contract, recipients: recipients() }): PaiflowEventRecord => ({
  eventId: "evt-payout", id: "2", kind: "PAYOUT", topic: "payout", ledger: 5377166, txHash: tx, occurredAt: "2026-10-25T05:00:00Z", data,
});
const credits = [
  { address: ops, amountStroops: "5000000" },
  { address: payroll, amountStroops: "3000000" },
  { address: supplies, amountStroops: "2000000" },
];
const run = (events: PaiflowEventRecord[], c: typeof credits | null | undefined = credits, env = envelopes) =>
  verifyDistribution({ originalTxHash: tx, txStatus: success, events, totalStroops: "10000000", envelopes: env, credits: c });

describe("Split payout verification (HO-04)", () => {
  it("verifies all three envelopes from the PAYOUT event plus Horizon credits", () => {
    const d = run([payoutEvent()]);
    expect(d).toMatchObject({ verified: 3, total: 3, allVerified: true, anyMismatch: false });
    expect(d.results.map((r) => r.result.observedAmountStroops)).toEqual(["5000000", "3000000", "2000000"]);
    expect(d.results[0].result.eventIds).toEqual(["evt-payout"]);
  });

  it("never uses the event's amount 0 as an observed amount and never verifies without a credit", () => {
    for (const none of [null, undefined, []] as const) {
      const d = verifyDistribution({ originalTxHash: tx, txStatus: success, events: [payoutEvent()], totalStroops: "10000000", envelopes, credits: none });
      expect(d.verified).toBe(0);
      expect(d.results.every((r) => r.result.state === "awaiting_events" && r.result.observedAmountStroops === null)).toBe(true);
    }
  });

  it("stays pending until the PAYOUT event is indexed, even with credits", () => {
    const d = run([], credits);
    expect(d.results.every((r) => r.result.state === "awaiting_events")).toBe(true);
  });

  it("marks a different credit as a mismatch for that envelope only", () => {
    const d = run([payoutEvent()], [credits[0], { address: payroll, amountStroops: "2999999" }, credits[2]]);
    expect(d.results.map((r) => r.result.state)).toEqual(["verified", "mismatch", "verified"]);
    expect(d.results[1].result).toMatchObject({ expectedAmountStroops: "3000000", observedAmountStroops: "2999999" });
    expect(d).toMatchObject({ verified: 2, allVerified: false, anyMismatch: true });
  });

  it("keeps the k-of-n rule: 2 credited of 3 is not a verified distribution", () => {
    const d = run([payoutEvent()], [credits[0], credits[1], { address: "G" + "Z".repeat(55), amountStroops: "2000000" }]);
    expect(d).toMatchObject({ verified: 2, total: 3, allVerified: false });
    expect(d.results[2].result.state).toBe("mismatch"); // effects were read; nothing reached this recipient
  });

  it.each([
    ["different order", [envelopes[1], envelopes[0], envelopes[2]]],
    ["different bps", [{ ...envelopes[0], bps: 4000 }, envelopes[1], envelopes[2]]],
    ["different address", [{ ...envelopes[0], recipientAddress: `G${"E".repeat(54)}2` }, envelopes[1], envelopes[2]]],
    ["a missing recipient", [envelopes[0], envelopes[1]]],
  ])("marks every envelope mismatch when the event has %s", (_, eventList) => {
    const d = run([payoutEvent({ from: contract, recipients: recipients(eventList) })]);
    expect(d.results.every((r) => r.result.state === "mismatch")).toBe(true);
    expect(d.verified).toBe(0);
  });

  it("ignores a payout event from another transaction and an unreadable payload", () => {
    expect(run([{ ...payoutEvent(), txHash: "f".repeat(64) }]).results[0].result.state).toBe("awaiting_events");
    expect(run([payoutEvent({ from: contract })]).results[0].result.state).toBe("awaiting_events");
  });

  it("waits when the transaction is not final", () => {
    const d = verifyDistribution({
      originalTxHash: tx, txStatus: { ...success, status: "PENDING" }, events: [payoutEvent()], totalStroops: "10000000", envelopes, credits,
    });
    expect(d.verified).toBe(0);
  });

  it("gives the rounding remainder to the last envelope", () => {
    const d = verifyDistribution({
      originalTxHash: tx, txStatus: success, events: [payoutEvent()], totalStroops: "10000001", envelopes,
      credits: [credits[0], credits[1], { address: supplies, amountStroops: "2000001" }],
    });
    expect(d.allVerified).toBe(true);
  });
});

const effects = (records: unknown[]) =>
  vi.fn(async () => new Response(JSON.stringify({ _embedded: { records } }), { status: 200 })) as unknown as typeof fetch;

describe("readTxCredits (Horizon effects)", () => {
  it("reads native account_credited effects as stroops and ignores other effects", async () => {
    const f = effects([
      { type: "account_debited", account: SIGNER, asset_type: "native", amount: "1.0000000" },
      { type: "account_credited", account: ops, asset_type: "native", amount: "0.5000000" },
      { type: "account_credited", account: payroll, asset_type: "native", amount: "0.3000000" },
      { type: "account_credited", account: supplies, asset_type: "credit_alphanum4", amount: "9.0000000" },
    ]);
    expect(await readTxCredits(tx, f)).toEqual([
      { address: ops, amountStroops: "5000000" },
      { address: payroll, amountStroops: "3000000" },
    ]);
    expect(vi.mocked(f).mock.calls[0][0]).toContain(`/transactions/${tx}/effects`);
  });

  it.each([
    ["a 404", vi.fn(async () => new Response("{}", { status: 404 })) as unknown as typeof fetch],
    ["a network failure", vi.fn(async () => { throw new TypeError("offline"); }) as unknown as typeof fetch],
    ["a missing page", vi.fn(async () => new Response("{}", { status: 200 })) as unknown as typeof fetch],
    ["a bad amount", effects([{ type: "account_credited", account: ops, asset_type: "native", amount: "lots" }])],
  ])("returns null (not an empty list) after %s", async (_, f) => {
    expect(await readTxCredits(tx, f)).toBeNull();
  });

  it("rejects a malformed hash without calling Horizon", async () => {
    const f = effects([]);
    expect(await readTxCredits("nope", f)).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
});

describe("reconcilePlan with the real Split flow", () => {
  const ctx = context();
  const recorded = (data: unknown = { from: contract, recipients: recipients(ctx.envelopes.map((e) => ({ position: e.position, bps: e.bps, recipientAddress: e.recipientAddress }))) }) => [
    { eventId: "evt-1", id: "1", kind: "RECEIVE", topic: "deposit", ledger: 9, txHash: "a".repeat(64), occurredAt: "2026-10-25T05:00:00Z", data: { from: SIGNER, amount: "10000000", asset: "XLM" } },
    { eventId: "evt-2", id: "2", kind: "PAYOUT", topic: "payout", ledger: 9, txHash: "a".repeat(64), occurredAt: "2026-10-25T05:00:00Z", data },
  ];
  const paid = attemptRow({
    state: "success", finalStatus: "SUCCESS", network: "testnet", originalTxHash: "a".repeat(64), signedXdr: "signed", ledger: 9,
    planVersionId: ctx.versionId, createdAt: "2026-10-25T04:58:00Z",
  });

  function setup(txCredits?: (h: string) => Promise<{ address: string; amountStroops: string }[] | null>, data?: unknown) {
    const h = makeHarness();
    h.db.acquireReconcileLease.mockResolvedValue(true);
    h.db.releaseReconcileLease.mockResolvedValue(undefined);
    h.db.consumeReconcileBudget.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
    h.db.getPaymentContext.mockResolvedValue(ok(ctx));
    h.db.getLatestAttempt.mockResolvedValue(paid);
    h.db.getEventCursor.mockResolvedValue(null);
    h.db.advanceEventCursor.mockResolvedValue(true);
    h.db.upsertPaiflowEvents.mockResolvedValue(ok({ inserted: 0 }));
    h.db.listStoredEvents.mockResolvedValue(recorded(data));
    h.db.recordPaymentReceiptVerification.mockResolvedValue(ok({ state: "verified" }));
    h.db.recordEnvelopePayoutVerification.mockResolvedValue(ok({ state: "verified", planState: "distribution_verified", verified: 3, total: 3 }));
    h.paiflow.events.list.mockResolvedValue(sdk({ items: [], nextCursor: null, hasMore: false }));
    h.paiflow.transactions.get.mockResolvedValue(sdk({ txHash: "a".repeat(64), network: "testnet", status: "SUCCESS", ledger: 9 }));
    const deps = { ...h.deps, txCredits };
    return { ...h, run: () => reconcilePlan(deps, { planId: PLAN, actorUserId: USER, holder: "test" }) };
  }
  const creditsFor = () =>
    ctx.envelopes.map((e) => ({ address: e.recipientAddress, amountStroops: e.expectedShareStroops }));

  it("verifies every envelope from the event and the Horizon credits", async () => {
    const txCredits = vi.fn(async () => creditsFor());
    const h = setup(txCredits);
    expect(await h.run()).toMatchObject({ receipt: "verified", payouts: { verified: 3, total: 3 } });
    expect(txCredits).toHaveBeenCalledWith("a".repeat(64));
    expect(h.db.recordEnvelopePayoutVerification.mock.calls.every((c) => c[0].result.state === "verified")).toBe(true);
    expect(h.sdkCalls()).toBe(h.paiflow.transactions.get.mock.calls.length + h.paiflow.events.list.mock.calls.length);
  });

  it("stays pending when Horizon cannot be read, and when no reader is wired", async () => {
    for (const reader of [vi.fn(async () => null), undefined]) {
      const h = setup(reader);
      expect(await h.run()).toMatchObject({ payouts: { verified: 0, total: 3 } });
      expect(h.db.recordEnvelopePayoutVerification.mock.calls.every((c) => c[0].result.state === "awaiting_events")).toBe(true);
    }
  });

  it("does not call Horizon before the payout event is indexed", async () => {
    const txCredits = vi.fn(async () => creditsFor());
    const h = setup(txCredits);
    h.db.listStoredEvents.mockResolvedValue(recorded().slice(0, 1));
    await h.run();
    expect(txCredits).not.toHaveBeenCalled();
  });

  it("records a mismatch when the credited amount differs", async () => {
    const h = setup(async () => creditsFor().map((c, i) => (i === 1 ? { ...c, amountStroops: "1" } : c)));
    await h.run();
    expect(h.db.recordEnvelopePayoutVerification.mock.calls.map((c) => c[0].result.state)).toEqual(["verified", "mismatch", "verified"]);
  });
});
