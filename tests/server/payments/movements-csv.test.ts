import { describe, expect, it } from "vitest";
import { csvCell, movementsToCsv, MOVEMENTS_CSV_HEADERS } from "@/server/paiflow/movements-csv";
import type { MoneyMovementDTO } from "@/lib/money-movements";

const HASH = "a".repeat(64);
const row = (patch: Partial<MoneyMovementDTO> = {}): MoneyMovementDTO => ({
  at: "2026-10-25T16:30:00.000Z",
  kind: "envelope_payout",
  planId: "p",
  planPurpose: "October budget",
  label: "Operations",
  amountStroops: "50000000",
  stellarTxHash: HASH,
  verification: "verified",
  explorerUrl: `https://stellar.expert/explorer/testnet/tx/${HASH}`,
  verified: true,
  ...patch,
});

describe("csvCell", () => {
  it("prefixes formula starters with an apostrophe", () => {
    for (const bad of ["=1+1", "+1", "-1", "@SUM(A1)", "\t=x", "\r=x"]) expect(csvCell(bad).replace(/^"/, "")).toMatch(/^'/);
  });
  it("quotes commas, quotes and newlines", () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell("plain")).toBe("plain");
  });
});

describe("movementsToCsv", () => {
  it("writes UTC and PHT dates, XLM and stroops", () => {
    const [header, line] = movementsToCsv([row()]).trim().split("\r\n");
    expect(header).toBe(MOVEMENTS_CSV_HEADERS.join(","));
    expect(line).toContain("2026-10-25 16:30:00 UTC,2026-10-26 00:30:00 PHT,October budget,Operations,5,50000000,");
    expect(line).toContain(HASH);
  });
  it("labels unverified rows pending and a payment row as whole plan", () => {
    const csv = movementsToCsv([row({ verified: false, verification: "awaiting_events", label: null, kind: "budget_payment" })]);
    expect(csv).toContain("Whole plan payment");
    expect(csv).toContain("pending (awaiting_events)");
  });
  it("neutralises a formula in the plan purpose and has no ledger wording", () => {
    const csv = movementsToCsv([row({ planPurpose: "=HYPERLINK(\"x\")" })]);
    expect(csv).toContain("\"'=HYPERLINK");
    expect(csv.toLowerCase()).not.toContain("ledger");
  });
  it("is header-only for no rows", () => {
    expect(movementsToCsv([])).toBe(`${MOVEMENTS_CSV_HEADERS.join(",")}\r\n`);
  });
});
