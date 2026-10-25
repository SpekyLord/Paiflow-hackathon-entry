// Next.js calls register() once per server process. The reconciliation worker
// is opt-in (CYFER_RECONCILER=1) and Node-only; see reconcile-runner.ts.
export async function register() {
  // The import must sit inside a bare NEXT_RUNTIME check so webpack drops it from
  // the Edge build (reconcile-runner uses node:crypto).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (process.env.CYFER_RECONCILER !== "1") return;
    const { startReconcileWorker } = await import("@/server/paiflow/reconcile-runner");
    startReconcileWorker();
  }
}
