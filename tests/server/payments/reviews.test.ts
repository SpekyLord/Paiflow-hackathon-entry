import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { listReviewsHandler, resolveReviewHandler } from "@/server/paiflow/reviews";
import { respond } from "@/server/paiflow/route-kit";
import { jsonRequest, makeHarness, no, ok, read, USER } from "./harness";

const REVIEW = "00000000-0000-4000-8000-000000000030";
const review = { reviewId: REVIEW, scope: "payment_attempt", refId: "x", reason: "r", openedAt: "t", resolvedAt: null, outcome: null };
const valid = {
  outcome: "payment_success_confirmed",
  justification: "Checked the original hash on Stellar Expert: SUCCESS in ledger 9.",
  evidence: { stellarTxHash: "a".repeat(64), explorerCheckedAt: "2026-10-25T05:00:00Z", notes: "Matches the plan total." },
};

function setup(isOperator = true) {
  const h = makeHarness({ userId: USER, isOperator });
  h.db.listOperatorReviews.mockResolvedValue([review]);
  h.db.resolveOperatorReview.mockImplementation(async () => {
    h.db.listOperatorReviews.mockResolvedValue([{ ...review, outcome: "payment_success_confirmed", resolvedAt: "t2" }]);
    return ok({});
  });
  const resolve = (body: unknown = valid, id = REVIEW) =>
    respond(() => resolveReviewHandler(h.deps, jsonRequest(`/api/operator/reviews/${id}`, body), id)).then(read);
  const list = () => respond(() => listReviewsHandler(h.deps, new Request("http://localhost:3000/api/operator/reviews"))).then(read);
  return { ...h, resolve, list };
}

describe("operator reviews", () => {
  it("lists reviews for an operator", async () => {
    const h = setup();
    expect((await h.list()).body.data).toEqual([review]);
  });

  it("resolves with justification and evidence and returns the updated review", async () => {
    const h = setup();
    const res = await h.resolve();
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ reviewId: REVIEW, outcome: "payment_success_confirmed" });
    expect(h.db.resolveOperatorReview).toHaveBeenCalledWith({
      reviewId: REVIEW,
      operatorUserId: USER,
      outcome: "payment_success_confirmed",
      justification: valid.justification,
      evidence: valid.evidence,
    });
  });

  it("never prepares, submits or calls Paiflow", async () => {
    const h = setup();
    await h.resolve();
    await h.resolve({ ...valid, outcome: "no_action", evidence: { notes: "duplicate" } });
    expect(h.sdkCalls()).toBe(0);
    expect(h.db.beginPaymentAttempt).not.toHaveBeenCalled();
  });

  it.each([
    ["an empty justification", { ...valid, justification: "   " }],
    ["an unknown outcome", { ...valid, outcome: "pay_again" }],
    ["a release retry (SHOULD)", { ...valid, outcome: "release_retry_authorised" }],
    ["a confirmation without a hash", { ...valid, evidence: { notes: "looked" } }],
    ["a malformed hash", { ...valid, evidence: { ...valid.evidence, stellarTxHash: "AUDIT" } }],
  ])("returns 422 for %s", async (_, body) => {
    const h = setup();
    const res = await h.resolve(body);
    expect(res.status).toBe(422);
    expect(h.db.resolveOperatorReview).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-operator and 401 without a session", async () => {
    const h = setup(false);
    expect((await h.resolve()).body.error.code).toBe("OPERATOR_REQUIRED");
    expect((await h.list()).status).toBe(403);
    const anon = makeHarness(null);
    const res = await respond(() => listReviewsHandler(anon.deps, new Request("http://localhost:3000/x"))).then(read);
    expect(res.status).toBe(401);
  });

  it("passes a database refusal through", async () => {
    const h = setup();
    h.db.resolveOperatorReview.mockResolvedValue(no("STATE_CONFLICT"));
    expect((await h.resolve()).status).toBe(409);
  });
});
