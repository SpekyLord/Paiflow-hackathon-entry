// Next.js calls register() once per server process. The reconciliation worker
// is opt-in (CYFER_RECONCILER=1) and Node-only; see reconcile-runner.ts.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.CYFER_RECONCILER !== "1") return;
  const { startReconcileWorker } = await import("@/server/paiflow/reconcile-runner");
  startReconcileWorker();
}
