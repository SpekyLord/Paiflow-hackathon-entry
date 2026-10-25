import "server-only";
import { randomUUID } from "node:crypto";
import { liveDeps, type PaymentDeps } from "@/server/paiflow/deps";
import { isPaiflowConfigured } from "@/server/paiflow/config";
import { reconcilePlan } from "@/server/paiflow/reconcile";

// C-12 / B-06 choice (a): a lease-guarded interval on the demo server process,
// started from src/instrumentation.ts when CYFER_RECONCILER=1. With no browser
// open, paid plans still move toward verified evidence.
// Caveats: per process only (each process runs its own timer, and the DB
// leases stop two of them working on one plan); it stops when the process
// stops; serverless hosts do not keep timers alive.

export const SWEEP_INTERVAL_MS = 30_000;
const PLANS_PER_SWEEP = 10;

export async function runReconcileSweep(deps: PaymentDeps, holder: string) {
  const scopes = await deps.db.listScopesNeedingReconciliation(PLANS_PER_SWEEP);
  let ran = 0;
  for (const { scope } of scopes) {
    try {
      const attempt = await deps.db.getLatestAttempt(scope);
      if (!attempt) continue;
      // The attempt's creator is the plan's signer, a member of its org.
      const summary = await reconcilePlan(deps, { planId: scope.planId, actorUserId: attempt.createdBy, holder });
      if (summary.status === "ran") ran += 1;
    } catch (error) {
      const code = (error as { code?: string }).code ?? (error instanceof Error ? error.name : "unknown");
      console.error("[reconcile] plan pass failed", scope.planId, code);
    }
  }
  return { plans: scopes.length, ran };
}

type WorkerGlobal = typeof globalThis & { __cyferReconciler?: ReturnType<typeof setInterval> };

export function startReconcileWorker(): boolean {
  const g = globalThis as WorkerGlobal;
  if (g.__cyferReconciler || !isPaiflowConfigured()) return false; // once per process; needs Paiflow
  const holder = `worker:${process.pid}:${randomUUID()}`;
  let running = false;
  g.__cyferReconciler = setInterval(async () => {
    if (running) return; // never overlap sweeps
    running = true;
    try {
      await runReconcileSweep(await liveDeps(), holder);
    } catch (error) {
      console.error("[reconcile] sweep failed", error instanceof Error ? error.name : typeof error);
    } finally {
      running = false;
    }
  }, SWEEP_INTERVAL_MS);
  g.__cyferReconciler.unref?.();
  console.info("[reconcile] background worker started");
  return true;
}
