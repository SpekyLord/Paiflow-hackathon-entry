import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { refreshEvidenceHandler } from "@/server/paiflow/evidence";
import { respond } from "@/server/paiflow/route-kit";
import { attemptRow, context, jsonRequest, makeHarness, no, ok, ORG, PLAN, read, USER } from "./harness";

function setup(session = { userId: USER, isOperator: false }) {
  const h = makeHarness(session);
  const gate = new Map<string, number>();
  h.db.acquireReconcileLease.mockResolvedValue(true);
  h.db.releaseReconcileLease.mockResolvedValue(undefined);
  h.db.consumeReconcileBudget.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
  h.db.getPaymentContext.mockResolvedValue(ok(context()));
  h.db.getLatestAttempt.mockResolvedValue(attemptRow({ state: "submitted", originalTxHash: "a".repeat(64), signedXdr: "s" }));
  h.db.recordStatusCheck.mockImplementation(async () => ok(attemptRow({ state: "pending", finalStatus: "PENDING", originalTxHash: "a".repeat(64) })));
  h.paiflow.transactions.get.mockResolvedValue({ data: { txHash: "a".repeat(64), network: "testnet", status: "PENDING" }, metadata: {} });
  const run = (headers: Record<string, string> = {}) =>
    respond(() => refreshEvidenceHandler(h.deps, jsonRequest("/refresh", {}, headers), { orgId: ORG, planId: PLAN }, gate)).then(read);
  return { ...h, run };
}

describe("POST …/evidence/refresh", () => {
  it("runs one reconcile pass and returns the plan detail", async () => {
    const h = setup();
    const res = await h.run();
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ planId: PLAN });
    expect(h.deps.planDetail).toHaveBeenCalledWith(ORG, PLAN, USER);
    expect(h.paiflow.transactions.get).toHaveBeenCalledTimes(1);
    expect(h.paiflow.execute.submit).not.toHaveBeenCalled();
    expect(h.paiflow.execute.prepare).not.toHaveBeenCalled();
  });

  it("allows refreshes at least 15 s apart per plan", async () => {
    const h = setup();
    await h.run();
    const second = await h.run();
    expect(second.status).toBe(429);
    expect(second.headers.get("Retry-After")).toBe("15");
    h.advance(15_000);
    expect((await h.run()).status).toBe(200);
  });

  it("refuses non-members, other orgs, anonymous and cross-origin callers", async () => {
    const h = setup();
    h.db.getPaymentContext.mockResolvedValueOnce(no("NOT_MEMBER"));
    expect((await h.run()).status).toBe(403);
    h.db.getPaymentContext.mockResolvedValueOnce(ok(context({ orgId: "00000000-0000-4000-8000-000000000077" })));
    expect((await h.run()).status).toBe(404);
    expect((await h.run({ origin: "https://evil.example" })).status).toBe(403);
    const anonymous = setup(null as never);
    expect((await anonymous.run()).status).toBe(401);
    expect(h.sdkCalls() + anonymous.sdkCalls()).toBe(0);
  });
});
