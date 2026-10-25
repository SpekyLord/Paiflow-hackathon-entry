import type { StellarTxHash, IsoUtc } from "@/contracts/dto";
import type { VerificationState } from "@/contracts/states";

// ERP-LOG: the expense log of money movements CYFER has evidence for. This
// is a read-only list, not a general ledger (no double entry, no accounts).
export interface MoneyMovementRow {
  at: IsoUtc;
  kind: "budget_payment" | "envelope_payout";
  planId: string;
  planPurpose: string;
  /** Envelope label for a payout; null for the whole-plan payment. */
  label: string | null;
  amountStroops: string;
  /** Stellar transaction hash only. CYFER audit/ledger hashes never go here. */
  stellarTxHash: StellarTxHash | null;
  verification: VerificationState;
}

export interface MoneyMovementDTO extends MoneyMovementRow {
  explorerUrl: string | null;
  /** True only when the payout or payment is verified. */
  verified: boolean;
}

export interface MoneyMovementsPage {
  rows: MoneyMovementDTO[];
  /** Pass as `before` for the next page; null on the last page. */
  nextBefore: IsoUtc | null;
  /** Verified rows only; one unit (stroops), payments and payouts kept apart. */
  totals: { verifiedPaymentStroops: string; verifiedPayoutStroops: string; pendingCount: number };
}

export const isVerifiedMovement = (row: Pick<MoneyMovementRow, "verification">) => row.verification === "verified";

export function movementTotals(rows: readonly MoneyMovementRow[]): MoneyMovementsPage["totals"] {
  let payments = 0n;
  let payouts = 0n;
  let pendingCount = 0;
  for (const row of rows) {
    if (!isVerifiedMovement(row)) {
      pendingCount += 1;
      continue;
    }
    if (row.kind === "budget_payment") payments += BigInt(row.amountStroops);
    else payouts += BigInt(row.amountStroops);
  }
  return { verifiedPaymentStroops: payments.toString(), verifiedPayoutStroops: payouts.toString(), pendingCount };
}
