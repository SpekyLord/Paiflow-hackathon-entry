import "server-only";
import type { PaymentAttemptRow, StatusLookup } from "@/server/db/financial-core";
import { callPaiflow, type PaymentDeps } from "@/server/paiflow/deps";
import { SafePaiflowError } from "@/server/paiflow/errors";

// Read-only status lookups on the ORIGINAL hash (PRD §G.4). These never
// submit or prepare. A 404 is "not found yet", never "failed".

export interface LookupResult {
  lookup: StatusLookup;
  requestId: string | null;
  retryAfterSeconds: number | null;
}

export async function lookupStatus(deps: PaymentDeps, deploymentId: string, txHash: string): Promise<LookupResult> {
  try {
    const res = await callPaiflow(() => deps.paiflow(deploymentId).transactions.get(txHash));
    const d = res.data;
    return {
      lookup: { kind: "found", status: d.status, txHash: d.txHash, network: d.network, ledger: d.ledger ?? null },
      requestId: res.metadata.requestId ?? null,
      retryAfterSeconds: null,
    };
  } catch (error) {
    const safe = error as SafePaiflowError;
    if (safe.upstreamStatus === 404)
      return { lookup: { kind: "not_found" }, requestId: safe.requestId, retryAfterSeconds: null };
    return {
      lookup: { kind: "transport_error", httpStatus: safe.upstreamStatus, code: safe.upstreamCode ?? safe.code },
      requestId: safe.requestId,
      retryAfterSeconds: safe.retryAfterSeconds,
    };
  }
}

export const isFinal = (row: PaymentAttemptRow) => row.finalStatus === "SUCCESS" || row.finalStatus === "FAILED";

// One lookup recorded through Francis's recordStatusCheck. Returns the
// updated row, or the previous one if recording failed.
export async function checkOnce(
  deps: PaymentDeps,
  attempt: PaymentAttemptRow,
  checksExhausted = false,
): Promise<{ row: PaymentAttemptRow; retryAfterSeconds: number | null }> {
  const result = await lookupStatus(deps, attempt.deploymentId, attempt.originalTxHash!);
  const recorded = await deps.db.recordStatusCheck({
    attemptId: attempt.id,
    requestId: result.requestId,
    checksExhausted,
    lookup: result.lookup,
  });
  return { row: recorded.ok ? recorded.value : attempt, retryAfterSeconds: result.retryAfterSeconds };
}

export const MAX_LOOKUPS = 6;
export const CHECK_WINDOW_MS = 30_000;
const MAX_BACKOFF_MS = 8_000;

// Bounded check (CL-05): at most 6 lookups in 30 s, backoff 1, 2, 4, 8, 8 s,
// honouring Retry-After. checksExhausted is set only on the last lookup of a
// window that ends without a final status.
export async function boundedCheck(deps: PaymentDeps, attempt: PaymentAttemptRow): Promise<PaymentAttemptRow> {
  const started = deps.now();
  let row = attempt;
  for (let i = 0; i < MAX_LOOKUPS; i += 1) {
    const backoff = Math.min(1_000 * 2 ** i, MAX_BACKOFF_MS);
    const last = i === MAX_LOOKUPS - 1 || deps.now() + backoff - started > CHECK_WINDOW_MS;
    const result = await checkOnce(deps, row, last);
    row = result.row;
    if (isFinal(row) || last) return row;
    const wait = Math.max(backoff, (result.retryAfterSeconds ?? 0) * 1_000);
    if (deps.now() + wait - started > CHECK_WINDOW_MS) return row; // rate-limited: stop, not exhausted
    await deps.sleep(wait);
  }
  return row;
}
