// Level: MOCKED. get_wallet_context returns the context object directly (no {ok, value} envelope).
import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createFinancialDb } from "@/server/db/financial-core";

const context = {
  binding: null,
  plans: [],
  escrow: [],
  history: [],
  verifiedTotals: { receivedStroops: "0", refundedStroops: "0" },
};
const client = (reply: { data: unknown; error: { code?: string } | null }) =>
  ({ rpc: vi.fn(async () => reply) }) as unknown as SupabaseClient;

describe("getWalletContext", () => {
  it("returns the plain object the SQL function produces", async () => {
    const c = client({ data: context, error: null });
    expect(await createFinancialDb(c).getWalletContext("u1")).toEqual(context);
    expect(c.rpc).toHaveBeenCalledWith("get_wallet_context", { p_user: "u1" });
  });

  it("returns null on an error or an unexpected shape", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await createFinancialDb(client({ data: null, error: { code: "42501" } })).getWalletContext("u1")).toBeNull();
    expect(await createFinancialDb(client({ data: { ok: false, code: "X" }, error: null })).getWalletContext("u1")).toBeNull();
  });
});
