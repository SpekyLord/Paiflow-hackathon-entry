import "server-only";
import type { PaymentAttemptViewDTO } from "@/contracts/dto";
import type { PaymentAttemptRow } from "@/server/db/financial-core";

// Browser-safe view of an attempt row: never XDR, history or request IDs.
export function toAttemptView(row: PaymentAttemptRow): PaymentAttemptViewDTO {
  return {
    attemptId: row.id,
    state: row.state,
    originalTxHash: row.originalTxHash,
    expiresAt: row.expiresAt,
    submittedAt: row.submitStatus ? row.updatedAt : null,
    finalStatus: row.finalStatus,
    ledger: row.ledger,
    hasSignedEnvelope: row.signedXdr !== null,
    lastCheckedAt: row.lastCheckedAt,
  };
}
