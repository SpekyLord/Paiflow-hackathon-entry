import { describe, expect, it, vi } from "vitest";
import { Networks } from "@stellar/stellar-sdk";
import { PaiflowApiError, PaiflowTimeoutError } from "@paiflow/sdk";

vi.mock("server-only", () => ({}));

import { preparePaymentHandler } from "@/server/paiflow/payment";
import { respond, RouteError } from "@/server/paiflow/route-kit";
import { envelopeHash } from "@/lib/stellar/envelope";
import { ATTEMPT, attemptRow, context, jsonRequest, makeHarness, no, ok, ORG, PLAN, read, sdk, USER } from "./harness";
import { fixtureUnsignedXdr } from "../../fixtures/paiflow/transaction-fixture";

const path = `/api/orgs/${ORG}/budget-plans/${PLAN}/pay/prepare`;
const hash = envelopeHash(fixtureUnsignedXdr);
const expiresAt = "2026-10-25T05:03:00Z";
const prepared = sdk({ network: "testnet", networkPassphrase: Networks.TESTNET, xdr: fixtureUnsignedXdr, expiresAt }, { historyRequestId: "hist-1" });

function setup(userId = `${USER}`) {
  const h = makeHarness({ userId, isOperator: false });
  const calls: string[] = [];
  const track = (name: keyof typeof h.db, impl: (...a: never[]) => unknown) =>
    h.db[name].mockImplementation(async (...a: never[]) => {
      calls.push(name);
      return impl(...a);
    });
  track("getPaymentContext", () => ok(context()));
  track("beginPaymentAttempt", () => ok({ outcome: "created", attempt: attemptRow(), context: context() }));
  track("recordPreparation", (i: { preparedXdr: string; originalTxHash: string; expiresAt: string; feeStroops: string }) =>
    ok(attemptRow({ state: "prepared", preparedXdr: i.preparedXdr, originalTxHash: i.originalTxHash, expiresAt: i.expiresAt, feeStroops: i.feeStroops })),
  );
  track("markSignatureRequested", () => ok({}));
  track("failPreparation", () => ok({}));
  track("markExpiredUnsigned", () => ok({}));
  h.paiflow.execute.prepare.mockImplementation(async () => {
    calls.push("sdk.prepare");
    return prepared;
  });
  const run = (params = { orgId: ORG, planId: PLAN }) =>
    respond(() => preparePaymentHandler(h.deps, jsonRequest(path, {}), params)).then(read);
  return { ...h, calls, run };
}

describe("POST …/pay/prepare", () => {
  it("prepares, persists before responding, and returns the signer's review", async () => {
    const h = setup();
    const res = await h.run();
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      attemptId: ATTEMPT,
      network: "testnet",
      originalTxHash: hash,
      amountStroops: "10000000",
      feeStroops: "100",
      outcome: "created",
      recipients: [
        { label: "Operations", expectedShareStroops: "5000000" },
        { label: "Payroll", expectedShareStroops: "3000000" },
        { label: "Supplies", expectedShareStroops: "2000000" },
      ],
    });
    expect(h.calls).toEqual(["getPaymentContext", "beginPaymentAttempt", "sdk.prepare", "recordPreparation", "markSignatureRequested"]);
    expect(h.paiflow.execute.prepare).toHaveBeenCalledWith({ from: context().signerAddress, amount: "10000000" });
    expect(h.db.recordPreparation.mock.calls[0][0]).toMatchObject({ historyRequestId: "hist-1", originalTxHash: hash });
    expect(JSON.stringify(res.body)).not.toContain("hist-1");
  });

  it("refuses an unapproved plan with 403 and 0 Paiflow calls (REQ-BUD-02 AC4)", async () => {
    const h = setup();
    h.db.beginPaymentAttempt.mockResolvedValue(no("PLAN_NOT_APPROVED"));
    const res = await h.run();
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("PLAN_NOT_APPROVED");
    expect(h.sdkCalls()).toBe(0);
  });

  it.each([
    ["a non-signer", context({ signerUserId: "00000000-0000-4000-8000-000000000011" }), "NOT_SIGNER"],
    ["a different bound wallet", context({ viewerBinding: { address: `G${"Z".repeat(54)}2`, verifiedAt: "x" } }), "WALLET_MISMATCH"],
    ["no bound wallet", context({ viewerBinding: null }), "WALLET_MISMATCH"],
  ])("refuses %s with 403 before beginning an attempt", async (_, ctx, code) => {
    const h = setup();
    h.db.getPaymentContext.mockResolvedValue(ok(ctx));
    const res = await h.run();
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe(code);
    expect(h.db.beginPaymentAttempt).not.toHaveBeenCalled();
    expect(h.sdkCalls()).toBe(0);
  });

  it("returns the existing attempt on a second call with 1 Paiflow call in total (CL-06)", async () => {
    const h = setup();
    await h.run();
    const stored = (await h.db.recordPreparation.mock.results[0].value).value;
    h.db.beginPaymentAttempt.mockResolvedValue(ok({ outcome: "existing", attempt: stored, context: context() }));
    const second = await h.run();
    expect(second.body.data).toMatchObject({ attemptId: ATTEMPT, originalTxHash: hash, outcome: "existing" });
    expect(h.paiflow.execute.prepare).toHaveBeenCalledTimes(1);
  });

  it("does not hand out an expired preparation again", async () => {
    const h = setup();
    const stale = attemptRow({ state: "prepared", preparedXdr: fixtureUnsignedXdr, originalTxHash: hash, expiresAt: "2026-10-25T04:00:00Z" });
    h.db.beginPaymentAttempt.mockResolvedValue(ok({ outcome: "existing", attempt: stale, context: context() }));
    const res = await h.run();
    expect(res.body.error.code).toBe("ATTEMPT_UNRESOLVED");
    expect(h.db.markExpiredUnsigned).toHaveBeenCalledWith(ATTEMPT);
    expect(h.sdkCalls()).toBe(0);
  });

  it("refuses an existing attempt that already holds a signed envelope", async () => {
    const h = setup();
    const signed = attemptRow({ state: "submitted", preparedXdr: "x", originalTxHash: hash, expiresAt, signedXdr: "s" });
    h.db.beginPaymentAttempt.mockResolvedValue(ok({ outcome: "existing", attempt: signed, context: context() }));
    expect((await h.run()).body.error.code).toBe("ATTEMPT_UNRESOLVED");
    expect(h.sdkCalls()).toBe(0);
  });

  it.each([
    ["a timeout", new PaiflowTimeoutError(), 502],
    ["a 422", new PaiflowApiError(422, "invalid", "m", null, null, { status: 422, requestId: "r-9" }), 422],
  ])("closes the attempt as prepare_failed after %s", async (_, error, status) => {
    const h = setup();
    h.paiflow.execute.prepare.mockRejectedValue(error);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await h.run();
    expect(res.status).toBe(status);
    expect(h.db.failPreparation).toHaveBeenCalledWith(expect.objectContaining({ attemptId: ATTEMPT }));
    expect(h.db.recordPreparation).not.toHaveBeenCalled();
  });

  it("refuses a mainnet preparation and never records it", async () => {
    const h = setup();
    h.paiflow.execute.prepare.mockResolvedValue(sdk({ network: "mainnet", networkPassphrase: Networks.PUBLIC, xdr: fixtureUnsignedXdr, expiresAt }));
    const res = await h.run();
    expect(res.body.error.code).toBe("CAPABILITY_MISMATCH");
    expect(h.db.recordPreparation).not.toHaveBeenCalled();
    expect(h.db.failPreparation).toHaveBeenCalled();
  });

  it("rate-limits prepare per user before any database or Paiflow call", async () => {
    const h = setup();
    vi.mocked(h.deps.rateLimit).mockImplementation(() => {
      throw new RouteError("RATE_LIMITED", undefined, 30);
    });
    const res = await h.run();
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
    expect(h.deps.rateLimit).toHaveBeenCalledWith("prepare", USER);
    expect(h.db.beginPaymentAttempt).not.toHaveBeenCalled();
    expect(h.sdkCalls()).toBe(0);
  });

  it("returns 404 when the plan belongs to another organisation", async () => {
    const h = setup();
    h.db.getPaymentContext.mockResolvedValue(ok(context({ orgId: "00000000-0000-4000-8000-000000000077" })));
    expect((await h.run()).status).toBe(404);
    expect(h.sdkCalls()).toBe(0);
  });

  it("answers 401 without a session and 403 cross-origin", async () => {
    const anonymous = makeHarness(null);
    expect((await respond(() => preparePaymentHandler(anonymous.deps, jsonRequest(path, {}), { orgId: ORG, planId: PLAN })).then(read)).status).toBe(401);
    const h = setup();
    const res = await respond(() =>
      preparePaymentHandler(h.deps, jsonRequest(path, {}, { origin: "https://evil.example" }), { orgId: ORG, planId: PLAN }),
    ).then(read);
    expect(res.status).toBe(403);
    expect(h.sdkCalls()).toBe(0);
  });
});
