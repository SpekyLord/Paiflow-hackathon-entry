import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildWalletSummary } from "@/server/wallet-summary/summary";
import { HORIZON_TESTNET, readNativeBalance } from "@/server/wallet-summary/horizon";
import { SIGNER } from "./harness";

const now = () => Date.parse("2026-10-25T05:00:00Z");
const hash = "c".repeat(64);
const context = {
  binding: { address: SIGNER, verifiedAt: "2026-10-25T04:00:00Z" },
  plans: [{ orgId: "o", planId: "p", purpose: "Budget", dashboardState: "pending" as const, role: "signer" as const }],
  escrow: [],
  history: [
    { kind: "budget_payment" as const, refId: "p", amountStroops: "10000000", stellarTxHash: hash, verification: "verified" as const, at: "t" },
    { kind: "envelope_payout" as const, refId: "p", amountStroops: "5000000", stellarTxHash: "d".repeat(64), verification: "awaiting_events" as const, at: "t" },
    // A CYFER audit hash is not a Stellar transaction and must not appear.
    { kind: "budget_payment" as const, refId: "p", amountStroops: "1", stellarTxHash: "AUDIT-not-stellar", verification: "verified" as const, at: "t" },
  ],
  verifiedTotals: { receivedStroops: "5000000", refundedStroops: "0" },
};
const db = (value: typeof context | null = context) => ({ getWalletContext: vi.fn(async () => value) });
const horizon = (status: number, body: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe("wallet summary", () => {
  it("reads the bound address's native balance from Horizon Testnet", async () => {
    const fetchImpl = horizon(200, { balances: [{ asset_type: "credit_alphanum4", balance: "5.0000000" }, { asset_type: "native", balance: "9999.5000000" }] });
    const summary = await buildWalletSummary(db(), "u", now, fetchImpl);
    expect(summary.balance).toEqual({ state: "available", xlmStroops: "99995000000", asOf: "2026-10-25T05:00:00.000Z" });
    expect(vi.mocked(fetchImpl).mock.calls[0][0]).toBe(`${HORIZON_TESTNET}/accounts/${SIGNER}`);
  });

  it.each([
    ["a Horizon 404", horizon(404, {})],
    ["a Horizon 500", horizon(500, {})],
    ["a network failure", vi.fn(async () => { throw new TypeError("offline"); }) as unknown as typeof fetch],
    ["a malformed body", horizon(200, { balances: [{ asset_type: "native", balance: "lots" }] })],
  ])("shows unavailable, never 0, after %s", async (_, fetchImpl) => {
    const summary = await buildWalletSummary(db(), "u", now, fetchImpl);
    expect(summary.balance.state).toBe("unavailable");
    expect(summary.balance).not.toHaveProperty("xlmStroops");
  });

  it("does not call Horizon without a bound wallet", async () => {
    const fetchImpl = horizon(200, {});
    const summary = await buildWalletSummary(db({ ...context, binding: null as never }), "u", now, fetchImpl);
    expect(summary.balance.state).toBe("unavailable");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("keeps panels separate and lists only Stellar hashes with explorer links", async () => {
    const summary = await buildWalletSummary(db(), "u", now, horizon(200, { balances: [{ asset_type: "native", balance: "1.0000000" }] }));
    expect(summary.verifiedPayouts).toEqual({ receivedStroops: "5000000", refundedStroops: "0" });
    expect(summary.history).toHaveLength(2);
    expect(summary.history[0].explorerUrl).toBe(`https://stellar.expert/explorer/testnet/tx/${hash}`);
    expect(JSON.stringify(summary)).not.toContain("AUDIT");
    expect(summary.escrow).toEqual([]);
    expect(summary.network).toBe("testnet");
  });

  it("fails safely when the wallet context cannot be read", async () => {
    await expect(buildWalletSummary(db(null), "u", now)).rejects.toMatchObject({ code: "INTERNAL" });
  });

  it("refuses to query Horizon for an invalid address", async () => {
    const fetchImpl = horizon(200, {});
    expect(await readNativeBalance("../admin", fetchImpl)).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
