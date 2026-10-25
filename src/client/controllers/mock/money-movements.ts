import { movementTotals, type MoneyMovementsPage } from "@/lib/money-movements";

// Fixture rows for the expense log. Clearly fake: the hash is not a real
// Stellar transaction and the page must show the FIXTURE banner.
const HASH = "f".repeat(64);
const URL = `https://stellar.expert/explorer/testnet/tx/${HASH}`;
const PURPOSE = "[FIXTURE] October operating budget";

export function moneyMovementsFixture(): MoneyMovementsPage {
  const rows: MoneyMovementsPage["rows"] = [
    { at: "2026-10-25T05:00:00.000Z", kind: "budget_payment", planId: "fixture-plan", planPurpose: PURPOSE, label: null, amountStroops: "100000000", stellarTxHash: HASH, verification: "verified", explorerUrl: URL, verified: true },
    { at: "2026-10-25T05:01:00.000Z", kind: "envelope_payout", planId: "fixture-plan", planPurpose: PURPOSE, label: "Operations", amountStroops: "50000000", stellarTxHash: HASH, verification: "verified", explorerUrl: URL, verified: true },
    { at: "2026-10-25T05:01:00.000Z", kind: "envelope_payout", planId: "fixture-plan", planPurpose: PURPOSE, label: "Payroll", amountStroops: "30000000", stellarTxHash: HASH, verification: "awaiting_events", explorerUrl: URL, verified: false },
  ];
  return { rows, nextBefore: null, totals: movementTotals(rows) };
}
