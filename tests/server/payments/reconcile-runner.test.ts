import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { runReconcileSweep, startReconcileWorker } from "@/server/paiflow/reconcile-runner";
import { attemptRow, context, makeHarness, ok, PLAN } from "./harness";

const OTHER = "00000000-0000-4000-8000-000000000022";
const SIGNER_USER = "00000000-0000-4000-8000-000000000033";

function setup() {
  const h = makeHarness();
  const held = new Set<string>();
  h.db.acquireReconcileLease.mockImplementation(async (key: string) => (held.has(key) ? false : (held.add(key), true)));
  h.db.releaseReconcileLease.mockImplementation(async (key: string) => void held.delete(key));
  h.db.consumeReconcileBudget.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
  h.db.getPaymentContext.mockResolvedValue(ok(context()));
  h.db.listScopesNeedingReconciliation.mockResolvedValue([
    { scope: { kind: "plan", planId: PLAN }, deploymentId: "d" },
    { scope: { kind: "plan", planId: OTHER }, deploymentId: "d" },
  ]);
  h.db.getLatestAttempt.mockImplementation(async ({ planId }: { planId: string }) =>
    planId === PLAN ? attemptRow({ originalTxHash: "a".repeat(64), finalStatus: "FAILED", state: "failed", createdBy: SIGNER_USER }) : null,
  );
  return { ...h, held };
}

afterEach(() => {
  vi.unstubAllEnvs();
  delete (globalThis as { __cyferReconciler?: unknown }).__cyferReconciler;
});

describe("runReconcileSweep", () => {
  it("reconciles each listed plan as the attempt's creator", async () => {
    const h = setup();
    const result = await runReconcileSweep(h.deps, "worker-1");
    expect(result).toEqual({ plans: 2, ran: 1 });
    expect(h.db.getPaymentContext).toHaveBeenCalledWith({ kind: "plan", planId: PLAN }, SIGNER_USER);
    expect(h.db.listScopesNeedingReconciliation).toHaveBeenCalledWith(10);
  });

  it("does not double-process a plan another runner holds", async () => {
    const h = setup();
    h.held.add(`reconcile:plan:${PLAN}`);
    expect((await runReconcileSweep(h.deps, "worker-2")).ran).toBe(0);
    expect(h.db.getPaymentContext).not.toHaveBeenCalled();
  });

  it("keeps going when one plan fails, logging only safe codes", async () => {
    const h = setup();
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    h.db.getLatestAttempt.mockImplementation(async () => attemptRow({ originalTxHash: "a".repeat(64), createdBy: SIGNER_USER }));
    h.db.getPaymentContext.mockResolvedValueOnce({ ok: false, code: "NOT_MEMBER" });
    const result = await runReconcileSweep(h.deps, "worker-3");
    expect(result.plans).toBe(2);
    expect(errors).toHaveBeenCalledWith("[reconcile] plan pass failed", PLAN, "NOT_MEMBER");
    expect(h.paiflow.execute.submit).not.toHaveBeenCalled();
  });
});

describe("startReconcileWorker", () => {
  it("starts once per process and only when Paiflow is configured", () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.stubEnv("PAIFLOW_API_TOKEN", "");
    expect(startReconcileWorker()).toBe(false);
    vi.stubEnv("PAIFLOW_API_TOKEN", `pfd_${"a".repeat(64)}`);
    expect(startReconcileWorker()).toBe(true);
    expect(startReconcileWorker()).toBe(false);
    clearInterval((globalThis as { __cyferReconciler?: ReturnType<typeof setInterval> }).__cyferReconciler);
  });
});
