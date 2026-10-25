import { describe, expect, it, vi } from "vitest";
import { createMovementsStore } from "@/client/controllers/money-movements";
import { moneyMovementsFixture } from "@/client/controllers/mock/money-movements";
import { movementTotals, type MoneyMovementsPage } from "@/lib/money-movements";

const toError = () => ({ code: "INTERNAL" as const, message: "x" });
const page = (nextBefore: string | null, verified = true): MoneyMovementsPage => {
  const base = moneyMovementsFixture().rows[1];
  const rows = [{ ...base, verified, verification: verified ? ("verified" as const) : ("awaiting_events" as const) }];
  return { rows, nextBefore, totals: movementTotals(rows) };
};

describe("money movements store", () => {
  it("loads, then pages with the cursor and recomputes totals over all rows", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(page("2026-10-24T00:00:00.000Z"))
      .mockResolvedValueOnce(page(null, false));
    const store = createMovementsStore(fetchPage, toError);
    await store.reload();
    expect(store.getSnapshot()).toMatchObject({ loading: false, nextBefore: "2026-10-24T00:00:00.000Z" });
    await store.loadMore();
    expect(fetchPage).toHaveBeenLastCalledWith("2026-10-24T00:00:00.000Z");
    const s = store.getSnapshot();
    expect(s.rows).toHaveLength(2);
    expect(s.totals).toEqual({ verifiedPaymentStroops: "0", verifiedPayoutStroops: "50000000", pendingCount: 1 });
    await store.loadMore(); // no cursor: no call
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("keeps loaded rows and reports a safe error when a page fails", async () => {
    const fetchPage = vi.fn().mockResolvedValueOnce(page("c")).mockRejectedValueOnce(new Error("boom"));
    const store = createMovementsStore(fetchPage, toError);
    await store.reload();
    await store.loadMore();
    expect(store.getSnapshot()).toMatchObject({ loading: false, error: { code: "INTERNAL" } });
    expect(store.getSnapshot().rows).toHaveLength(1);
  });
});
