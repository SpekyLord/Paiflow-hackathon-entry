import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkPlanPayment,
  getWalletSummary,
  preparePlanPayment,
  resolveOperatorReview,
  resubmitPlanPayment,
  submitPlanPayment,
} from "@/client/api/payments";
import { ApiClientError } from "@/client/http";

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const ok = (data: unknown) => new Response(JSON.stringify({ data }), { status: 200 });
const lastCall = () => {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  return { url, init, body: init.body ? JSON.parse(init.body) : undefined };
};

describe("payments API client", () => {
  it("posts prepare to the plan route with an empty JSON body", async () => {
    fetchMock.mockResolvedValue(ok({ attemptId: "a" }));
    expect(await preparePlanPayment("org/1", "plan 2")).toEqual({ attemptId: "a" });
    const { url, init, body } = lastCall();
    expect(url).toBe("/api/orgs/org%2F1/budget-plans/plan%202/pay/prepare");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("same-origin");
    expect(body).toEqual({});
  });

  it("sends submit, check and resubmit bodies per the contract", async () => {
    fetchMock.mockImplementation(async () => ok({}));
    await submitPlanPayment("o", "p", "att", "signed-xdr");
    expect(lastCall().body).toEqual({ attemptId: "att", signedXdr: "signed-xdr" });
    await checkPlanPayment("o", "p", "att");
    expect(lastCall()).toMatchObject({ url: "/api/orgs/o/budget-plans/p/pay/check", body: { attemptId: "att" } });
    await resubmitPlanPayment("o", "p", "att", "f".repeat(64));
    expect(lastCall().body).toEqual({
      attemptId: "att",
      originalTxHash: "f".repeat(64),
      intent: "resubmit_same_signed_envelope",
    });
  });

  it("reads the wallet summary with GET", async () => {
    fetchMock.mockResolvedValue(ok({ network: "testnet" }));
    await getWalletSummary();
    expect(lastCall()).toMatchObject({ url: "/api/wallet/summary", init: { method: "GET" } });
  });

  it("surfaces PLAN_NOT_APPROVED as a safe error", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "PLAN_NOT_APPROVED", message: "Not approved." } }), { status: 403 }),
    );
    await expect(preparePlanPayment("o", "p")).rejects.toMatchObject({
      status: 403,
      safe: { code: "PLAN_NOT_APPROVED" },
    });
  });

  it("maps a lost response to UPSTREAM_UNRESOLVED and does not retry", async () => {
    fetchMock.mockRejectedValue(new TypeError("network"));
    const error = await submitPlanPayment("o", "p", "att", "x").catch((e) => e);
    expect(error).toBeInstanceOf(ApiClientError);
    expect(error.safe.code).toBe("UPSTREAM_UNRESOLVED");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("encodes the review id", async () => {
    fetchMock.mockResolvedValue(ok({}));
    await resolveOperatorReview("r/1", { outcome: "no_action", justification: "checked", evidence: { notes: "n" } });
    expect(lastCall().url).toBe("/api/operator/reviews/r%2F1");
  });
});
