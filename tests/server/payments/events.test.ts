import { describe, expect, it, vi } from "vitest";
import { PaiflowApiError } from "@paiflow/sdk";

vi.mock("server-only", () => ({}));

import { ingestEvents } from "@/server/paiflow/events";
import { DEPLOYMENT, makeHarness, ok, PLAN, sdk } from "./harness";

type Item = { id: string; eventId: string; kind: string; topic: string | null; ledger: number; txHash: string; occurredAt: string; data: unknown };
const item = (n: number): Item => ({
  id: `${n}`,
  eventId: `evt-${n}`,
  kind: "PAYOUT",
  topic: "pay",
  ledger: n,
  txHash: "A".repeat(64),
  occurredAt: "2026-10-25T05:00:00Z",
  data: { recipient: "G...", payment: "1" },
});
const page = (items: Item[], nextCursor: string | null, hasMore: boolean) => sdk({ items, nextCursor, hasMore });

// A cursor store with compare-and-set, like advance_event_cursor.
function setup() {
  const h = makeHarness();
  const cursors = new Map<string, string | null>();
  const stored = new Map<string, unknown>();
  h.db.acquireReconcileLease.mockResolvedValue(true);
  h.db.releaseReconcileLease.mockResolvedValue(undefined);
  h.db.consumeReconcileBudget.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
  h.db.getEventCursor.mockImplementation(async (_d: string, scope: string) => cursors.get(scope) ?? null);
  h.db.advanceEventCursor.mockImplementation(async (_d: string, scope: string, expected: string | null, next: string) => {
    if ((cursors.get(scope) ?? null) !== expected) return false;
    cursors.set(scope, next);
    return true;
  });
  h.db.upsertPaiflowEvents.mockImplementation(async (_d: string, events: { eventId: string }[]) => {
    let inserted = 0;
    for (const e of events) {
      if (stored.has(e.eventId)) continue;
      stored.set(e.eventId, e);
      inserted += 1;
    }
    return ok({ inserted });
  });
  return { ...h, cursors, stored };
}

describe("ingestEvents", () => {
  it("ingests every page of a multi-page history and records completeness", async () => {
    const h = setup();
    h.paiflow.events.list
      .mockResolvedValueOnce(page([item(1), item(2)], "c1", true))
      .mockResolvedValueOnce(page([item(3)], "c2", true))
      .mockResolvedValueOnce(page([item(4)], "c3", false));
    const r = await ingestEvents(h.deps, { deploymentId: DEPLOYMENT, holder: "test" });
    expect(r).toMatchObject({ status: "ran", pages: 3, inserted: 4, complete: true });
    expect(h.paiflow.events.list.mock.calls.map((c) => c[0])).toEqual([
      { limit: 100 },
      { limit: 100, cursor: "c1" },
      { limit: 100, cursor: "c2" },
    ]);
    expect(h.cursors.get("all")).toBe("c3");
    expect(h.db.releaseReconcileLease).toHaveBeenCalledWith(`events:${DEPLOYMENT}`, "test");
  });

  it("ignores duplicate events", async () => {
    const h = setup();
    h.paiflow.events.list.mockResolvedValue(page([item(1), item(2)], null, false));
    await ingestEvents(h.deps, { deploymentId: DEPLOYMENT, holder: "a" });
    const second = await ingestEvents(h.deps, { deploymentId: DEPLOYMENT, holder: "a" });
    expect(second.inserted).toBe(0);
    expect(h.stored.size).toBe(2);
  });

  it("never treats the page cap as completeness", async () => {
    const h = setup();
    let n = 0;
    h.paiflow.events.list.mockImplementation(async () => page([item(++n)], `c${n}`, true));
    const r = await ingestEvents(h.deps, { deploymentId: DEPLOYMENT, holder: "a", maxPages: 2 });
    expect(r).toMatchObject({ pages: 2, complete: false });
  });

  it("does not clobber a concurrent cursor advance", async () => {
    const h = setup();
    h.paiflow.events.list.mockImplementationOnce(async () => {
      h.cursors.set("all", "other-runner"); // another runner moves first
      return page([item(1)], "mine", true);
    });
    h.paiflow.events.list.mockResolvedValueOnce(page([item(2)], "after-other", false));
    await ingestEvents(h.deps, { deploymentId: DEPLOYMENT, holder: "a" });
    expect(h.paiflow.events.list.mock.calls[1][0]).toEqual({ limit: 100, cursor: "other-runner" });
    expect(h.cursors.get("all")).toBe("after-other");
  });

  it("uses a separate tx: cursor scope for one payment hash", async () => {
    const h = setup();
    const hash = "b".repeat(64);
    h.paiflow.events.list.mockResolvedValue(page([item(1)], "t1", false));
    await ingestEvents(h.deps, { deploymentId: DEPLOYMENT, holder: "a", txHash: hash });
    expect(h.paiflow.events.list).toHaveBeenCalledWith({ limit: 100, txHash: hash });
    expect(h.cursors.get(`tx:${hash}`)).toBe("t1");
    expect(h.cursors.has("all")).toBe(false);
  });

  it("stops at Retry-After and keeps the cursor", async () => {
    const h = setup();
    h.paiflow.events.list
      .mockResolvedValueOnce(page([item(1)], "c1", true))
      .mockRejectedValueOnce(new PaiflowApiError(429, "rate", "m", null, null, { status: 429, retryAfter: "12" }));
    const r = await ingestEvents(h.deps, { deploymentId: DEPLOYMENT, holder: "a" });
    expect(r).toMatchObject({ status: "rate_limited", retryAfterSeconds: 12, pages: 1, complete: false });
    expect(h.cursors.get("all")).toBe("c1");
    expect(h.db.releaseReconcileLease).toHaveBeenCalled();
  });

  it("skips when another runner holds the lease", async () => {
    const h = setup();
    h.db.acquireReconcileLease.mockResolvedValue(false);
    expect((await ingestEvents(h.deps, { deploymentId: DEPLOYMENT, holder: "b" })).status).toBe("lease_busy");
    expect(h.sdkCalls()).toBe(0);
    expect(h.db.releaseReconcileLease).not.toHaveBeenCalled();
  });

  it("honours the per-scope poll budget", async () => {
    const h = setup();
    h.db.consumeReconcileBudget.mockResolvedValue({ allowed: false, retryAfterSeconds: 300 });
    const r = await ingestEvents(h.deps, { deploymentId: DEPLOYMENT, holder: "a", budgetScope: { kind: "plan", planId: PLAN } });
    expect(r).toMatchObject({ status: "budget_exhausted", retryAfterSeconds: 300 });
    expect(h.sdkCalls()).toBe(0);
  });

  it("never prepares or submits", async () => {
    const h = setup();
    h.paiflow.events.list.mockResolvedValue(page([item(1)], null, false));
    await ingestEvents(h.deps, { deploymentId: DEPLOYMENT, holder: "a" });
    expect(h.paiflow.execute.prepare).not.toHaveBeenCalled();
    expect(h.paiflow.execute.submit).not.toHaveBeenCalled();
  });

  it("lower-cases transaction hashes before storing", async () => {
    const h = setup();
    h.paiflow.events.list.mockResolvedValue(page([item(1)], null, false));
    await ingestEvents(h.deps, { deploymentId: DEPLOYMENT, holder: "a" });
    expect(h.db.upsertPaiflowEvents.mock.calls[0][1][0].txHash).toBe("a".repeat(64));
  });
});
