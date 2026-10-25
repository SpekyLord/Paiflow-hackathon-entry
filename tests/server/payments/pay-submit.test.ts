import { describe, expect, it, vi } from "vitest";
import { Keypair, Networks, TransactionBuilder } from "@stellar/stellar-sdk";
import { PaiflowApiError, PaiflowTimeoutError } from "@paiflow/sdk";

vi.mock("server-only", () => ({}));

import { submitPaymentHandler } from "@/server/paiflow/payment";
import { respond } from "@/server/paiflow/route-kit";
import { envelopeHash } from "@/lib/stellar/envelope";
import { ATTEMPT, attemptRow, context, jsonRequest, makeHarness, no, ok, ORG, PLAN, read, sdk } from "./harness";
import { buildFixtureTransaction, fixtureAddress, fixtureKeypair, fixtureUnsignedXdr } from "../../fixtures/paiflow/transaction-fixture";

const path = `/api/orgs/${ORG}/budget-plans/${PLAN}/pay/submit`;
const hash = envelopeHash(fixtureUnsignedXdr);
const sign = (xdr: string, keypair = fixtureKeypair) => {
  const tx = TransactionBuilder.fromXDR(xdr, Networks.TESTNET);
  tx.sign(keypair);
  return tx.toXDR();
};
const signedXdr = sign(fixtureUnsignedXdr);
const prepared = attemptRow({
  state: "signing",
  preparedXdr: fixtureUnsignedXdr,
  originalTxHash: hash,
  expiresAt: "2026-10-25T05:03:00Z",
  historyRequestId: "hist-1",
});

function setup() {
  const h = makeHarness();
  const calls: string[] = [];
  const ctx = context({ signerAddress: fixtureAddress, viewerBinding: { address: fixtureAddress, verifiedAt: "x" } });
  h.db.getPaymentContext.mockResolvedValue(ok(ctx));
  h.db.getAttempt.mockResolvedValue(prepared);
  h.db.recordEnvelopeRejection.mockResolvedValue(ok({}));
  h.db.persistSignedEnvelope.mockImplementation(async (i) => {
    calls.push("persistSignedEnvelope");
    return ok({ ...prepared, state: "signed_persisted", signedXdr: i.signedXdr });
  });
  h.db.recordSubmission.mockImplementation(async (i) => {
    calls.push("recordSubmission");
    return ok({ ...prepared, state: "submitted", signedXdr, submitStatus: i.outcome.kind });
  });
  h.db.recordStatusCheck.mockImplementation(async (i) => {
    calls.push("recordStatusCheck");
    const final = i.lookup.kind === "found" && (i.lookup.status === "SUCCESS" || i.lookup.status === "FAILED") ? i.lookup.status : null;
    return ok({ ...prepared, state: final === "SUCCESS" ? "success" : "pending", signedXdr, finalStatus: final, submitStatus: "response" });
  });
  h.paiflow.execute.submit.mockImplementation(async () => {
    calls.push("sdk.submit");
    return sdk({ txHash: hash, status: "PENDING" }, { requestId: "req-s" });
  });
  h.paiflow.transactions.get.mockImplementation(async () => {
    calls.push("sdk.status");
    return sdk({ txHash: hash, network: "testnet", status: "PENDING" });
  });
  const run = (body: unknown = { attemptId: ATTEMPT, signedXdr }) =>
    respond(() => submitPaymentHandler(h.deps, jsonRequest(path, body), { orgId: ORG, planId: PLAN })).then(read);
  return { ...h, calls, run };
}

describe("POST …/pay/submit", () => {
  it("persists the signed envelope before submitting, then checks the original hash once", async () => {
    const h = setup();
    const res = await h.run();
    expect(res.status).toBe(200);
    expect(h.calls).toEqual(["persistSignedEnvelope", "sdk.submit", "recordSubmission", "sdk.status", "recordStatusCheck"]);
    expect(h.paiflow.execute.submit).toHaveBeenCalledWith({ signedXdr }, { wait: false, preparationRequestId: "hist-1" });
    expect(h.paiflow.transactions.get).toHaveBeenCalledWith(hash);
    expect(h.db.persistSignedEnvelope.mock.calls[0][0]).toMatchObject({ signedBodyHash: hash, receivedAfterExpiry: false });
    const text = JSON.stringify(res.body);
    expect(text).not.toContain(signedXdr);
    expect(text).not.toContain("hist-1");
    expect(text).not.toContain("req-s");
    expect(res.body.data).toMatchObject({ attemptId: ATTEMPT, hasSignedEnvelope: true, finalStatus: null });
  });

  it.each([
    ["a changed body", sign(buildFixtureTransaction("changed").toXDR()), "BODY_CHANGED", "ENVELOPE_CHANGED"],
    ["an unreadable envelope", "not-xdr", "UNPARSEABLE", "VALIDATION"],
    ["another signer", sign(fixtureUnsignedXdr, Keypair.fromRawEd25519Seed(Buffer.alloc(32, 8))), "WRONG_SIGNER", "SIGNATURE_INVALID"],
  ])("rejects and keeps %s without submitting", async (_, xdr, reason, code) => {
    const h = setup();
    const res = await h.run({ attemptId: ATTEMPT, signedXdr: xdr });
    expect(res.body.error.code).toBe(code);
    expect(h.db.recordEnvelopeRejection).toHaveBeenCalledWith(expect.objectContaining({ reason, signedXdr: xdr }));
    expect(h.db.persistSignedEnvelope).not.toHaveBeenCalled();
    expect(h.sdkCalls()).toBe(0);
  });

  it("rejects a fee-bump envelope", async () => {
    const h = setup();
    const inner = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
    const feeBump = TransactionBuilder.buildFeeBumpTransaction(
      Keypair.fromRawEd25519Seed(Buffer.alloc(32, 9)),
      "200",
      inner as Parameters<typeof TransactionBuilder.buildFeeBumpTransaction>[2],
      Networks.TESTNET,
    ).toXDR();
    const res = await h.run({ attemptId: ATTEMPT, signedXdr: feeBump });
    expect(res.body.error.code).toBe("ENVELOPE_CHANGED");
    expect(h.db.recordEnvelopeRejection).toHaveBeenCalledWith(expect.objectContaining({ reason: "FEE_BUMP" }));
    expect(h.sdkCalls()).toBe(0);
  });

  it.each([
    ["a 502", new PaiflowApiError(502, "bad_gateway", "m", null, null, { status: 502, requestId: "r1" })],
    ["a timeout", new PaiflowTimeoutError()],
  ])("records %s as an unresolved transport error and never prepares again", async (_, error) => {
    const h = setup();
    h.paiflow.execute.submit.mockRejectedValue(error);
    const res = await h.run();
    expect(res.status).toBe(200);
    expect(h.db.recordSubmission.mock.calls[0][0].outcome.kind).toBe("transport_error");
    expect(h.paiflow.execute.prepare).not.toHaveBeenCalled();
    expect(h.paiflow.execute.submit).toHaveBeenCalledTimes(1);
    expect(res.body.data.finalStatus).not.toBe("SUCCESS");
    expect(res.body.data.state).not.toBe("success");
  });

  it("does not show success from a PENDING or UNKNOWN status", async () => {
    const h = setup();
    h.paiflow.transactions.get.mockResolvedValue(sdk({ txHash: hash, network: "testnet", status: "UNKNOWN" }));
    const res = await h.run();
    expect(res.body.data.state).not.toBe("success");
  });

  it("records a 404 status lookup as not_found, never failed", async () => {
    const h = setup();
    h.paiflow.transactions.get.mockRejectedValue(new PaiflowApiError(404, "not_found", "m", null, null, { status: 404 }));
    await h.run();
    expect(h.db.recordStatusCheck.mock.calls[0][0].lookup).toEqual({ kind: "not_found" });
  });

  it("refuses a second submit once a signed envelope is stored", async () => {
    const h = setup();
    h.db.getAttempt.mockResolvedValue({ ...prepared, signedXdr });
    const res = await h.run();
    expect(res.body.error.code).toBe("ATTEMPT_UNRESOLVED");
    expect(h.sdkCalls()).toBe(0);
  });

  it("does not submit when persisting the envelope fails", async () => {
    const h = setup();
    h.db.persistSignedEnvelope.mockResolvedValue(no("STATE_CONFLICT"));
    expect((await h.run()).body.error.code).toBe("STATE_CONFLICT");
    expect(h.sdkCalls()).toBe(0);
  });

  it("returns 413 for an oversize body or signedXdr", async () => {
    const h = setup();
    expect((await h.run({ attemptId: ATTEMPT, signedXdr: "A".repeat(200_001) })).status).toBe(413);
    expect((await h.run(JSON.stringify({ attemptId: ATTEMPT, signedXdr: "A".repeat(220_000) }))).status).toBe(413);
    expect(h.sdkCalls()).toBe(0);
  });

  it("refuses an attempt from another plan and a non-signer", async () => {
    const h = setup();
    h.db.getAttempt.mockResolvedValue({ ...prepared, budgetPlanId: "00000000-0000-4000-8000-000000000099" });
    expect((await h.run()).status).toBe(404);
    h.db.getPaymentContext.mockResolvedValue(ok(context({ signerUserId: "00000000-0000-4000-8000-000000000011" })));
    expect((await h.run()).body.error.code).toBe("NOT_SIGNER");
    expect(h.sdkCalls()).toBe(0);
  });
});
