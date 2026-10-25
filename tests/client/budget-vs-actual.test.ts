import { describe, expect, it } from "vitest";
import { planDetailFixture } from "@/contracts/fixtures";
import { PLAN_STATES } from "@/contracts/states";
import { budgetVsActual } from "@/lib/budget-vs-actual";

describe("budgetVsActual", () => {
  it("covers every plan state with one row per envelope", () => {
    for (const state of PLAN_STATES) {
      const plan = planDetailFixture(state);
      const result = budgetVsActual(plan);
      expect(result.rows).toHaveLength(plan.envelopes.length);
      expect(result.totals.approvedStroops).toBe(
        plan.envelopes.reduce((s, e) => s + BigInt(e.expectedShareStroops), 0n).toString(),
      );
    }
  });

  it("approved share totals the plan total (remainder is on the last envelope)", () => {
    const plan = planDetailFixture("approved");
    expect(budgetVsActual(plan).totals.approvedStroops).toBe(plan.totalStroops);
  });

  it("maps pre-payment states to planned / approved / pending", () => {
    expect(budgetVsActual(planDetailFixture("pending_approval")).rows.every((r) => r.status === "planned")).toBe(true);
    expect(budgetVsActual(planDetailFixture("approved")).rows.every((r) => r.status === "approved")).toBe(true);
    expect(budgetVsActual(planDetailFixture("payment_pending")).rows.every((r) => r.status === "pending")).toBe(true);
    for (const row of budgetVsActual(planDetailFixture("approved")).rows) {
      expect(row.verifiedStroops).toBeNull();
      expect(row.varianceStroops).toBeNull();
    }
  });

  it("2 of 3 verified gives no verified or variance total", () => {
    const result = budgetVsActual(planDetailFixture("payment_confirmed", { partial: true }));
    expect(result.rows.map((r) => r.status)).toEqual(["verified", "verified", "pending"]);
    expect(result.totals).toMatchObject({ verifiedCount: 2, totalCount: 3, verifiedStroops: null, varianceStroops: null });
    expect(result.rows[0].varianceStroops).toBe("0");
  });

  it("all verified gives totals in stroops with zero variance", () => {
    const result = budgetVsActual(planDetailFixture("distribution_verified"));
    expect(result.rows.every((r) => r.status === "verified")).toBe(true);
    expect(result.totals.verifiedStroops).toBe(result.totals.approvedStroops);
    expect(result.totals.varianceStroops).toBe("0");
  });

  it("a mismatch row is a mismatch, keeps both amounts and has no variance", () => {
    const plan = planDetailFixture("mismatch");
    plan.envelopes[1].payout!.observedAmountStroops = "1";
    const result = budgetVsActual(plan);
    const row = result.rows[1];
    expect(row.status).toBe("mismatch");
    expect(row.approvedStroops).toBe(plan.envelopes[1].expectedShareStroops);
    expect(row.observedStroops).toBe("1");
    expect(row.varianceStroops).toBeNull();
    expect(result.totals.verifiedStroops).toBeNull();
  });

  it("variance is bigint-exact and may be negative", () => {
    const plan = planDetailFixture("distribution_verified");
    plan.envelopes[0].payout!.observedAmountStroops = (BigInt(plan.envelopes[0].expectedShareStroops) + 5n).toString();
    expect(budgetVsActual(plan).rows[0].varianceStroops).toBe("-5");
  });

  it("passes the PHP planning figure through without converting it", () => {
    const plan = planDetailFixture("approved");
    const row = budgetVsActual(plan).rows[0];
    expect(row.plannedPhpCentavos).toBe(plan.envelopes[0].planningPhpCentavos);
    expect(JSON.stringify(budgetVsActual(plan).totals)).not.toContain("Php");
  });
});
