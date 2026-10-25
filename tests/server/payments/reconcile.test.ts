import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { reconcilePlan } from "@/server/paiflow/reconcile";
import { PAY_PAYOUT_SHAPE } from "@/server/paiflow/verify";
import { ATTEMPT, attemptRow, context, DEPLOYMENT, makeHarness, no, ok, PLAN, SIGNER, sdk, USER } from "./harness";

const hash = "a".repeat(64);
const paid = attemptRow({
  state: "success",
  finalStatus: "SUCCESS",
  network: "testnet",
  originalTxHash: hash,
  signedXdr: "signed",
  ledger: 9,
  planVersionId: context().versionId,
  createdAt: "2026-10-25T04:58:00Z",
});
const event = (n: number, kind: string, topic: string, data: unknown) => ({
  eventId: `evt-${n}`, id: `${n}`, kind, topic, ledger: 9, txHash: hash, occurredAt: "2026-10-25T05:00:00Z", data,
});
const deposit = event(1, "RECEIVE", "deposit", { from: SIGNER, amount: "10000000", asset: "XLM" });

function setup(attempt = paid) {
  const h = makeHarness();
  h.db.acquireReconcileLease.mockResolvedValue(true);
  h.db.releaseReconcileLease.mockResolvedValue(undefined);
  h.db.consumeReconcileBudget.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
  h.db.getPaymentContext.mockResolvedValue(ok(context()));
  h.db.getLatestAttempt.mockResolvedValue(attempt);
  h.db.getEventCursor.mockResolvedValue(null);
  h.db.advanceEventCursor.mockResolvedValue(true);
  h.db.upsertPaiflowEvents.mockResolvedValue(ok({ inserted: 0 }));
  h.db.listStoredEvents.mockResolvedValue([deposit]);
  h.db.recordPaymentReceiptVerification.mockResolvedValue(ok({ state: "verified" }));
  h.db.recordEnvelopePayoutVerification.mockResolvedValue(ok({ state: "awaiting_events", planState: "payment_confirmed", verified: 0, total: 3 }));
  h.db.openOperatorReview.mockResolvedValue(ok({ reviewId: "r1" }));
  h.db.recordStatusCheck.mockImplementation(async (i) =>
    ok({ ...attempt, finalStatus: i.lookup.kind === "found" ? i.lookup.status : null, state: i.lookup.kind === "found" && i.lookup.status === "SUCCESS" ? "success" : "pending" }),
  );
  h.paiflow.events.list.mockResolvedValue(sdk({ items: [], nextCursor: null, hasMore: false }));
  h.paiflow.transactions.get.mockResolvedValue(sdk({ txHash: hash, network: "testnet", status: "SUCCESS", ledger: 9 }));
  const run = () => reconcilePlan(h.deps, { planId: PLAN, actorUserId: USER, holder: "test" });
  return { ...h, run };
}

describe("reconcilePlan", () => {
  it("verifies the receipt and records every envelope for a SUCCESS payment", async () => {
    const h = setup();
    const r = await h.run();
    expect(r).toMatchObject({ status: "ran", finalStatus: "SUCCESS", receipt: "verified", payouts: { verified: 0, total: 3 } });
    expect(h.db.recordPaymentReceiptVerification.mock.calls[0][0].result.state).toBe("verified");
    expect(h.db.recordEnvelopePayoutVerification.mock.calls.map((c) => c[0].envelopePosition)).toEqual([0, 1, 2]);
    // B-04: the Split payout shape is unknown, so no envelope is verified.
    expect(h.db.recordEnvelopePayoutVerification.mock.calls.every((c) => c[0].result.state === "awaiting_events")).toBe(true);
    expect(h.paiflow.events.list).toHaveBeenCalledWith({ limit: 100, txHash: hash });
    expect(h.db.releaseReconcileLease).toHaveBeenCalledWith(`reconcile:plan:${PLAN}`, "test");
  });

  it("checks an unresolved signed attempt's original hash once, then verifies", async () => {
    const h = setup({ ...paid, finalStatus: null, state: "submitted" });
    await h.run();
    expect(h.paiflow.transactions.get).toHaveBeenCalledTimes(1);
    expect(h.paiflow.transactions.get).toHaveBeenCalledWith(hash);
    expect(h.db.recordPaymentReceiptVerification).toHaveBeenCalled();
  });

  it("never prepares or submits", async () => {
    const h = setup({ ...paid, finalStatus: null, state: "unknown" });
    await h.run();
    expect(h.paiflow.execute.prepare).not.toHaveBeenCalled();
    expect(h.paiflow.execute.submit).not.toHaveBeenCalled();
  });

  it("records nothing for a FAILED payment", async () => {
    const h = setup({ ...paid, finalStatus: "FAILED", state: "failed" });
    const r = await h.run();
    expect(r.finalStatus).toBe("FAILED");
    expect(h.db.recordPaymentReceiptVerification).not.toHaveBeenCalled();
    expect(h.db.recordEnvelopePayoutVerification).not.toHaveBeenCalled();
  });

  it("marks an expired unsigned attempt without Paiflow", async () => {
    const h = setup({ ...paid, finalStatus: null, state: "signing", signedXdr: null, expiresAt: "2026-10-25T04:00:00Z" });
    h.db.markExpiredUnsigned.mockResolvedValue(ok({}));
    h.db.getAttempt.mockResolvedValue({ ...paid, state: "expired_unsigned", finalStatus: null, signedXdr: null });
    const r = await h.run();
    expect(h.db.markExpiredUnsigned).toHaveBeenCalledWith(ATTEMPT);
    expect(r.attemptState).toBe("expired_unsigned");
    expect(h.sdkCalls()).toBe(0);
  });

  it("opens an operator review when evidence is still missing after the threshold", async () => {
    const h = setup();
    h.advance(11 * 60_000);
    expect((await h.run()).reviewOpened).toBe(true);
    expect(h.db.openOperatorReview).toHaveBeenCalledWith(expect.objectContaining({ scope: "verification", refId: ATTEMPT }));
  });

  it("does not open a review before the threshold or once fully verified", async () => {
    const early = setup();
    expect((await early.run()).reviewOpened).toBe(false);
    const late = setup();
    late.advance(11 * 60_000);
    const ctx = context();
    late.db.listStoredEvents.mockResolvedValue([
      deposit,
      ...ctx.envelopes.map((e, i) => event(10 + i, "PAYOUT", "pay", { recipient: e.recipientAddress, payment: e.expectedShareStroops, asset: "XLM" })),
    ]);
    const r = await reconcilePlan(late.deps, { planId: PLAN, actorUserId: USER, holder: "test", payoutShape: PAY_PAYOUT_SHAPE });
    expect(r).toMatchObject({ receipt: "verified", payouts: { verified: 3, total: 3 }, reviewOpened: false });
    expect(late.db.openOperatorReview).not.toHaveBeenCalled();
  });

  it("does not open a review over a recorded mismatch (the RPC already does)", async () => {
    const h = setup();
    h.advance(11 * 60_000);
    h.db.listStoredEvents.mockResolvedValue([
      deposit,
      event(10, "PAYOUT", "pay", { recipient: context().envelopes[0].recipientAddress, payment: "1", asset: "XLM" }),
    ]);
    await reconcilePlan(h.deps, { planId: PLAN, actorUserId: USER, holder: "test", payoutShape: PAY_PAYOUT_SHAPE });
    expect(h.db.recordEnvelopePayoutVerification.mock.calls[0][0].result.state).toBe("mismatch");
    expect(h.db.openOperatorReview).not.toHaveBeenCalled();
  });

  it("refuses to verify against a different plan version", async () => {
    const h = setup({ ...paid, planVersionId: "00000000-0000-4000-8000-000000000099" });
    const r = await h.run();
    expect(r.reviewOpened).toBe(true);
    expect(h.db.recordEnvelopePayoutVerification).not.toHaveBeenCalled();
  });

  it("skips when the lease is held, the budget is spent or there is no attempt", async () => {
    const busy = setup();
    busy.db.acquireReconcileLease.mockResolvedValue(false);
    expect((await busy.run()).status).toBe("lease_busy");
    const spent = setup();
    spent.db.consumeReconcileBudget.mockResolvedValue({ allowed: false, retryAfterSeconds: 120 });
    expect(await spent.run()).toMatchObject({ status: "budget_exhausted", retryAfterSeconds: 120 });
    const none = setup();
    none.db.getLatestAttempt.mockResolvedValue(null);
    expect((await none.run()).status).toBe("no_attempt");
    for (const h of [busy, spent, none]) expect(h.sdkCalls()).toBe(0);
  });

  it("refuses a non-member and still releases the lease", async () => {
    const h = setup();
    h.db.getPaymentContext.mockResolvedValue(no("NOT_MEMBER"));
    await expect(h.run()).rejects.toMatchObject({ code: "NOT_MEMBER" });
    expect(h.db.releaseReconcileLease).toHaveBeenCalled();
    expect(h.deps.paiflow).not.toHaveBeenCalledWith(DEPLOYMENT);
  });
});
