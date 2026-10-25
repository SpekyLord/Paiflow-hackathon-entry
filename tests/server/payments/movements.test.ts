import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { moneyMovementsHandler, moneyMovementsResponse, unavailableMovementsPort, type MovementsPort } from "@/server/paiflow/movements";
import type { MoneyMovementRow } from "@/lib/money-movements";
import { makeHarness, no, ok, ORG } from "./harness";

const HASH = "a".repeat(64);
const row = (patch: Partial<MoneyMovementRow> = {}): MoneyMovementRow => ({
  at: "2026-10-25T05:00:00.000Z",
  kind: "envelope_payout",
  planId: "p",
  planPurpose: "Budget",
  label: "Operations",
  amountStroops: "5000000",
  stellarTxHash: HASH,
  verification: "verified",
  ...patch,
});
const port = (result: Awaited<ReturnType<MovementsPort["listMoneyMovements"]>>) => ({ listMoneyMovements: vi.fn(async () => result) });
const req = (qs = "") => new Request(`http://localhost/api/orgs/${ORG}/money-movements${qs}`);

describe("money movements handler", () => {
  it("401 without a session, before touching the port", async () => {
    const h = makeHarness(null);
    const p = port(ok([]));
    await expect(moneyMovementsHandler(h.deps, p, req(), { orgId: ORG })).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(p.listMoneyMovements).not.toHaveBeenCalled();
  });

  it.each([["NOT_MEMBER"], ["NOT_FOUND"]])("maps a %s from the port", async (code) => {
    const h = makeHarness();
    await expect(moneyMovementsHandler(h.deps, port(no(code) as never), req(), { orgId: ORG })).rejects.toMatchObject({ code });
  });

  it("rejects a malformed org id, limit, before or format", async () => {
    const h = makeHarness();
    const p = port(ok([]));
    await expect(moneyMovementsHandler(h.deps, p, req(), { orgId: "x" })).rejects.toMatchObject({ code: "VALIDATION_SHAPE" });
    for (const qs of ["?limit=0", "?limit=abc", "?before=yesterday", "?format=xml"])
      await expect(moneyMovementsHandler(h.deps, p, req(qs), { orgId: ORG })).rejects.toMatchObject({ code: "VALIDATION_SHAPE" });
    expect(p.listMoneyMovements).not.toHaveBeenCalled();
  });

  it("excludes unverified rows from totals and labels them pending, with 0 Paiflow calls", async () => {
    const h = makeHarness();
    const p = port(
      ok([
        row(),
        row({ verification: "awaiting_events", amountStroops: "3000000" }),
        row({ kind: "budget_payment", label: null, amountStroops: "10000000" }),
      ]),
    );
    const { page } = await moneyMovementsHandler(h.deps, p, req(), { orgId: ORG });
    expect(page.totals).toEqual({ verifiedPaymentStroops: "10000000", verifiedPayoutStroops: "5000000", pendingCount: 1 });
    expect(page.rows.map((r) => r.verified)).toEqual([true, false, true]);
    expect(h.sdkCalls()).toBe(0);
  });

  it("never shows a CYFER audit hash as a Stellar hash", async () => {
    const h = makeHarness();
    const audit = row({ stellarTxHash: "AUDIT-not-stellar" as never });
    const { page } = await moneyMovementsHandler(h.deps, port(ok([audit])), req(), { orgId: ORG });
    expect(page.rows[0]).toMatchObject({ stellarTxHash: null, explorerUrl: null });
  });

  it("adds a Stellar Expert link and pages with a cursor when the page is full", async () => {
    const h = makeHarness();
    const p = port(ok([row({ at: "2026-10-25T05:00:00.000Z" }), row({ at: "2026-10-24T05:00:00.000Z" })]));
    const { page } = await moneyMovementsHandler(h.deps, p, req("?limit=2&before=2026-10-26T00:00:00Z"), { orgId: ORG });
    expect(page.rows[0].explorerUrl).toBe(`https://stellar.expert/explorer/testnet/tx/${HASH}`);
    expect(page.nextBefore).toBe("2026-10-24T05:00:00.000Z");
    expect(p.listMoneyMovements).toHaveBeenCalledWith({
      orgId: ORG,
      actorUserId: expect.any(String),
      limit: 2,
      before: "2026-10-26T00:00:00Z",
    });
  });

  it("serves CSV with safe headers and JSON errors in the shared envelope", async () => {
    const h = makeHarness();
    const res = await moneyMovementsResponse(h.deps, port(ok([row()])), req("?format=csv"), { orgId: ORG });
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(await res.text()).toContain("date_utc,date_pht");
    const bad = await moneyMovementsResponse(makeHarness(null).deps, port(ok([])), req(), { orgId: ORG });
    expect(bad.status).toBe(401);
  });

  it("answers honestly until the RPC exists", async () => {
    const res = await moneyMovementsResponse(makeHarness().deps, unavailableMovementsPort, req(), { orgId: ORG });
    expect(res.status).toBe(500);
    expect((await res.json()).error.message).toContain("not available yet");
  });
});
