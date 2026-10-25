import { describe, expect, it, vi } from "vitest";
import { PaiflowApiError } from "@paiflow/sdk";

vi.mock("server-only", () => ({}));

import { checkPaymentHandler, resubmitPaymentHandler } from "@/server/paiflow/payment";
import { respond } from "@/server/paiflow/route-kit";
import type { StatusLookup } from "@/server/db/financial-core";
import { ATTEMPT, attemptRow, context, jsonRequest, makeHarness, ok, ORG, PLAN, read, sdk } from "./harness";

const hash = "a".repeat(64);
const signedXdr = "AAAA-stored-signed-envelope";
const submitted = attemptRow({
  state: "submitted",
  preparedXdr: "unsigned",
  originalTxHash: hash,
  expiresAt: "2026-10-25T05:03:00Z",
  historyRequestId: "hist-1",
  signedXdr,
  submitStatus: "transport_error",
});

function setup(attempt = submitted) {
  const h = makeHarness();
  h.db.getPaymentContext.mockResolvedValue(ok(context()));
  h.db.getAttempt.mockResolvedValue(attempt);
  h.db.markExpiredUnsigned.mockResolvedValue(ok({}));
  h.db.recordSubmission.mockImplementation(async () => ok(attempt));
  h.db.recordStatusCheck.mockImplementation(async (i: { lookup: StatusLookup; checksExhausted: boolean }) => {
    const final = i.lookup.kind === "found" && (i.lookup.status === "SUCCESS" || i.lookup.status === "FAILED") ? i.lookup.status : null;
    return ok({
      ...attempt,
      finalStatus: final ?? (i.lookup.kind === "not_found" ? "NOT_FOUND" : "PENDING"),
      state: final === "SUCCESS" ? "success" : final === "FAILED" ? "failed" : i.checksExhausted ? "operator_review" : "pending",
    });
  });
  h.paiflow.transactions.get.mockResolvedValue(sdk({ txHash: hash, network: "testnet", status: "PENDING" }));
  h.paiflow.execute.submit.mockResolvedValue(sdk({ txHash: hash, status: "PENDING" }));
  const check = () =>
    respond(() => checkPaymentHandler(h.deps, jsonRequest("/check", { attemptId: ATTEMPT }), { orgId: ORG, planId: PLAN })).then(read);
  const resubmit = (body: Record<string, unknown> = {}) =>
    respond(() =>
      resubmitPaymentHandler(
        h.deps,
        jsonRequest("/resubmit", { attemptId: ATTEMPT, originalTxHash: hash, intent: "resubmit_same_signed_envelope", ...body }),
        { orgId: ORG, planId: PLAN },
      ),
    ).then(read);
  return { ...h, check, resubmit };
}

describe("POST …/pay/check", () => {
  it("stops at the first final status and never submits", async () => {
    const h = setup();
    h.paiflow.transactions.get
      .mockResolvedValueOnce(sdk({ txHash: hash, network: "testnet", status: "PENDING" }))
      .mockResolvedValueOnce(sdk({ txHash: hash, network: "testnet", status: "SUCCESS", ledger: 7 }));
    const res = await h.check();
    expect(res.body.data).toMatchObject({ state: "success", finalStatus: "SUCCESS" });
    expect(h.paiflow.transactions.get).toHaveBeenCalledTimes(2);
    expect(h.paiflow.transactions.get).toHaveBeenCalledWith(hash);
    expect(h.paiflow.execute.submit).not.toHaveBeenCalled();
    expect(h.paiflow.execute.prepare).not.toHaveBeenCalled();
  });

  it("makes at most 6 lookups within 30 s and marks the last one exhausted", async () => {
    const h = setup();
    const res = await h.check();
    expect(h.paiflow.transactions.get).toHaveBeenCalledTimes(6);
    expect(h.now() - Date.parse("2026-10-25T05:00:00Z")).toBeLessThanOrEqual(30_000);
    const flags = h.db.recordStatusCheck.mock.calls.map((c) => c[0].checksExhausted);
    expect(flags).toEqual([false, false, false, false, false, true]);
    expect(res.body.data.state).toBe("operator_review");
    expect(h.paiflow.execute.submit).not.toHaveBeenCalled();
  });

  it("caps backoff at 8 s", async () => {
    const h = setup();
    await h.check();
    expect(vi.mocked(h.deps.sleep).mock.calls.map((c) => c[0])).toEqual([1_000, 2_000, 4_000, 8_000, 8_000]);
  });

  it("honours Retry-After and stops without marking exhaustion when it runs past the window", async () => {
    const h = setup();
    h.paiflow.transactions.get.mockRejectedValue(new PaiflowApiError(429, "rate", "m", null, null, { status: 429, retryAfter: "60" }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await h.check();
    expect(h.paiflow.transactions.get).toHaveBeenCalledTimes(1);
    expect(h.db.recordStatusCheck.mock.calls[0][0]).toMatchObject({
      checksExhausted: false,
      lookup: { kind: "transport_error", httpStatus: 429 },
    });
  });

  it("records a 404 as not_found and keeps the payment unresolved", async () => {
    const h = setup();
    h.paiflow.transactions.get.mockRejectedValue(new PaiflowApiError(404, "not_found", "m", null, null, { status: 404 }));
    const res = await h.check();
    expect(h.db.recordStatusCheck.mock.calls[0][0].lookup).toEqual({ kind: "not_found" });
    expect(res.body.data.state).not.toBe("failed");
    expect(h.paiflow.execute.prepare).not.toHaveBeenCalled();
  });

  it("records FAILED; the plan moves only through recordStatusCheck", async () => {
    const h = setup();
    h.paiflow.transactions.get.mockResolvedValue(sdk({ txHash: hash, network: "testnet", status: "FAILED" }));
    const res = await h.check();
    expect(res.body.data).toMatchObject({ state: "failed", finalStatus: "FAILED" });
    expect(h.db.recordStatusCheck).toHaveBeenCalledTimes(1);
  });

  it("makes 0 Paiflow calls for a final attempt", async () => {
    const h = setup({ ...submitted, finalStatus: "SUCCESS", state: "success" });
    await h.check();
    expect(h.sdkCalls()).toBe(0);
  });

  it("marks an expired unsigned attempt without any Paiflow call", async () => {
    const h = setup({ ...submitted, signedXdr: null, state: "signing", expiresAt: "2026-10-25T04:00:00Z" });
    await h.check();
    expect(h.db.markExpiredUnsigned).toHaveBeenCalledWith(ATTEMPT);
    expect(h.sdkCalls()).toBe(0);
  });

  it("lets any member check (no signer requirement)", async () => {
    const h = setup();
    h.db.getPaymentContext.mockResolvedValue(ok(context({ signerUserId: "00000000-0000-4000-8000-000000000011" })));
    expect((await h.check()).status).toBe(200);
  });
});

describe("POST …/pay/resubmit", () => {
  it("re-sends exactly the stored bytes with the original preparation ID", async () => {
    const h = setup();
    const res = await h.resubmit();
    expect(res.status).toBe(200);
    expect(h.paiflow.execute.submit).toHaveBeenCalledTimes(1);
    expect(h.paiflow.execute.submit).toHaveBeenCalledWith({ signedXdr }, { wait: false, preparationRequestId: "hist-1" });
    expect(h.paiflow.execute.prepare).not.toHaveBeenCalled();
    expect(JSON.stringify(res.body)).not.toContain(signedXdr);
  });

  it.each([
    ["without the explicit intent", { intent: "resubmit" }, "VALIDATION_SHAPE"],
    ["for another hash", { originalTxHash: "b".repeat(64) }, "RESUBMIT_NOT_ALLOWED"],
  ])("refuses %s", async (_, body, code) => {
    const h = setup();
    expect((await h.resubmit(body)).body.error.code).toBe(code);
    expect(h.sdkCalls()).toBe(0);
  });

  it.each([
    ["no stored signed envelope", { signedXdr: null }],
    ["a final SUCCESS", { finalStatus: "SUCCESS" as const, state: "success" as const }],
    ["a final FAILED", { finalStatus: "FAILED" as const, state: "failed" as const }],
    ["a reconciled attempt", { state: "reconciled" as const }],
  ])("refuses with %s", async (_, patch) => {
    const h = setup({ ...submitted, ...patch });
    expect((await h.resubmit()).body.error.code).toBe("RESUBMIT_NOT_ALLOWED");
    expect(h.sdkCalls()).toBe(0);
  });

  it("requires the signer", async () => {
    const h = setup();
    h.db.getPaymentContext.mockResolvedValue(ok(context({ signerUserId: "00000000-0000-4000-8000-000000000011" })));
    expect((await h.resubmit()).body.error.code).toBe("NOT_SIGNER");
    expect(h.sdkCalls()).toBe(0);
  });
});
