import "server-only";
import type { WalletSummaryDTO } from "@/contracts/dto";
import type { FinancialDb } from "@/server/db/financial-core";
import { stellarExpertTxUrl } from "@/lib/explorer";
import { RouteError } from "@/server/paiflow/route-kit";
import { readNativeBalance } from "@/server/wallet-summary/horizon";

// C-13 (REQ-WAL-01): three separate panels, never summed: the wallet balance
// (Horizon), plan roles and payment status (CYFER), and verified payouts.
// Totals come from verified evidence only. History lists Stellar hashes only;
// CYFER audit and ledger hashes are not Stellar transactions.
export async function buildWalletSummary(
  db: Pick<FinancialDb, "getWalletContext">,
  userId: string,
  now: () => number,
  fetchImpl?: typeof fetch,
): Promise<WalletSummaryDTO> {
  const context = await db.getWalletContext(userId);
  if (!context) throw new RouteError("INTERNAL");
  const asOf = new Date(now()).toISOString();

  let balance: WalletSummaryDTO["balance"] = { state: "unavailable", asOf };
  if (context.binding) {
    const stroops = await readNativeBalance(context.binding.address, fetchImpl);
    if (stroops !== null) balance = { state: "available", xlmStroops: stroops, asOf };
  }

  const history = context.history
    .filter((h) => /^[a-f0-9]{64}$/.test(h.stellarTxHash))
    .map((h) => ({ ...h, explorerUrl: stellarExpertTxUrl(h.stellarTxHash) }));

  return {
    network: "testnet",
    binding: context.binding,
    balance,
    plans: context.plans,
    escrow: [], // SHOULD tier
    verifiedPayouts: context.verifiedTotals,
    history,
  };
}
