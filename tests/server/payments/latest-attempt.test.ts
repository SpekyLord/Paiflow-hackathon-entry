// Level: MOCKED. Proves the CR read getLatestAttempt builds the right query and maps the row; it does not touch a DB.
import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createFinancialDb } from "@/server/db/financial-core";

function fakeClient(rows: unknown[] | null, error: { code?: string } | null = null) {
  const calls: [string, ...unknown[]][] = [];
  const query = {
    select: (...a: unknown[]) => (calls.push(["select", ...a]), query),
    eq: (...a: unknown[]) => (calls.push(["eq", ...a]), query),
    order: (...a: unknown[]) => (calls.push(["order", ...a]), query),
    limit: (...a: unknown[]) => (calls.push(["limit", ...a]), Promise.resolve({ data: rows, error })),
  };
  const client = { from: (table: string) => (calls.push(["from", table]), query) } as unknown as SupabaseClient;
  return { db: createFinancialDb(client), calls };
}

const row = {
  id: "a1", budget_plan_id: "p1", plan_version_id: "v1", deployment_id: "d1", from_address: "G".padEnd(56, "A"),
  amount_stroops: "10000000", asset: { kind: "native" }, original_tx_hash: "0".repeat(64), state: "success",
  final_status: "SUCCESS", created_by: "u1", created_at: "t", updated_at: "t", ledger: "12",
};

describe("getLatestAttempt (CR for C-12)", () => {
  it("returns the newest attempt for the plan, including terminal ones", async () => {
    const { db, calls } = fakeClient([row]);
    const attempt = await db.getLatestAttempt({ kind: "plan", planId: "p1" });
    expect(attempt).toMatchObject({ id: "a1", state: "success", finalStatus: "SUCCESS", createdBy: "u1", ledger: 12 });
    expect(calls).toEqual([
      ["from", "payment_attempts"],
      ["select", "*"],
      ["eq", "budget_plan_id", "p1"],
      ["order", "created_at", { ascending: false }],
      ["limit", 1],
    ]);
  });

  it("returns null when there is no attempt or the read fails", async () => {
    expect(await fakeClient([]).db.getLatestAttempt({ kind: "plan", planId: "p1" })).toBeNull();
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await fakeClient(null, { code: "PGRST" }).db.getLatestAttempt({ kind: "plan", planId: "p1" })).toBeNull();
  });
});
