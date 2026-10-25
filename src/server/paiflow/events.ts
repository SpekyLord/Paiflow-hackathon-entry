import "server-only";
import type { PaiflowEventRecord, PayScope } from "@/server/db/financial-core";
import { callPaiflow, type PaymentDeps } from "@/server/paiflow/deps";
import { SafePaiflowError } from "@/server/paiflow/errors";
import { RouteError } from "@/server/paiflow/route-kit";

// C-10 (PRD §G.6): pages Paiflow events into paiflow_events. Read-only toward
// Paiflow. Dedupe is on eventId in the DB; cursors only move forward with a
// compare-and-set, so two runners never clobber each other.

export const EVENTS_PAGE_LIMIT = 100; // always explicit: SDK and OpenAPI defaults disagree
export const DEFAULT_MAX_PAGES = 5;
const LEASE_TTL_SECONDS = 60;

export interface IngestOptions {
  deploymentId: string;
  holder: string; // identifies this runner for the lease
  txHash?: string; // narrows to one transaction, with its own cursor scope
  maxPages?: number;
  budgetScope?: PayScope; // charged once per page against the 40/scope/hour cap
}

export interface IngestResult {
  status: "ran" | "lease_busy" | "budget_exhausted" | "rate_limited";
  pages: number;
  inserted: number;
  // false whenever Paiflow said there is more, including when the page cap
  // stopped the run: a cap is never completeness.
  complete: boolean;
  retryAfterSeconds: number | null;
}

export async function ingestEvents(deps: PaymentDeps, options: IngestOptions): Promise<IngestResult> {
  const { deploymentId, holder, txHash } = options;
  const scope = txHash ? (`tx:${txHash}` as const) : ("all" as const);
  const maxPages = Math.max(1, Math.min(options.maxPages ?? DEFAULT_MAX_PAGES, 20));
  const result: IngestResult = { status: "ran", pages: 0, inserted: 0, complete: false, retryAfterSeconds: null };

  const leaseKey = `events:${deploymentId}`;
  if (!(await deps.db.acquireReconcileLease(leaseKey, holder, LEASE_TTL_SECONDS))) return { ...result, status: "lease_busy" };
  try {
    while (result.pages < maxPages) {
      if (options.budgetScope) {
        const budget = await deps.db.consumeReconcileBudget(options.budgetScope);
        if (!budget.allowed) return { ...result, status: "budget_exhausted", retryAfterSeconds: budget.retryAfterSeconds };
      }
      const cursor = await deps.db.getEventCursor(deploymentId, scope);
      let page;
      try {
        page = await callPaiflow(() =>
          deps.paiflow(deploymentId).events.list({
            limit: EVENTS_PAGE_LIMIT,
            ...(cursor ? { cursor } : {}), // never send an empty cursor
            ...(txHash ? { txHash } : {}),
          }),
        );
      } catch (error) {
        const safe = error as SafePaiflowError;
        if (safe.code === "RATE_LIMITED") return { ...result, status: "rate_limited", retryAfterSeconds: safe.retryAfterSeconds };
        throw error;
      }
      result.pages += 1;

      const records: PaiflowEventRecord[] = page.data.items.map((item) => ({
        eventId: item.eventId,
        id: item.id,
        kind: item.kind,
        topic: item.topic,
        ledger: item.ledger,
        txHash: item.txHash.toLowerCase(),
        occurredAt: item.occurredAt,
        data: item.data ?? null,
      }));
      if (records.length) {
        const upserted = await deps.db.upsertPaiflowEvents(deploymentId, records);
        if (!upserted.ok) throw new RouteError(upserted.code);
        result.inserted += upserted.value.inserted;
      }

      const next = page.data.nextCursor;
      if (next) {
        // Lost race: another runner advanced the cursor. Re-read and continue.
        await deps.db.advanceEventCursor(deploymentId, scope, cursor, next);
      }
      if (!page.data.hasMore || !next) {
        result.complete = true;
        break;
      }
    }
    return result;
  } finally {
    await deps.db.releaseReconcileLease(leaseKey, holder);
  }
}
