import "server-only";
import { G_ADDRESS_PATTERN } from "@/contracts/limits";
import { parseHorizonBalance } from "@/lib/amount";

// Native XLM balance of a public Testnet account from Horizon (public data,
// no credentials). Any failure is null: the caller shows "unavailable",
// never 0.
export const HORIZON_TESTNET = "https://horizon-testnet.stellar.org";
const TIMEOUT_MS = 5_000;

export async function readNativeBalance(
  address: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  if (!G_ADDRESS_PATTERN.test(address)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(`${HORIZON_TESTNET}/accounts/${address}`, {
      signal: controller.signal,
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { balances?: { asset_type?: string; balance?: string }[] };
    const native = body.balances?.find((b) => b.asset_type === "native");
    return native?.balance ? parseHorizonBalance(native.balance) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Native account_credited effects of one transaction (public Horizon data).
// Null on any failure or odd page: never an empty list for "not read", so a
// failed read cannot be mistaken for "nothing was credited". Amounts are stroops.
export async function readTxCredits(
  txHash: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ address: string; amountStroops: string }[] | null> {
  if (!/^[a-f0-9]{64}$/.test(txHash)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(`${HORIZON_TESTNET}/transactions/${txHash}/effects?limit=200`, {
      signal: controller.signal,
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      _embedded?: { records?: { type?: string; account?: string; asset_type?: string; amount?: string }[] };
    };
    const records = body._embedded?.records;
    if (!Array.isArray(records)) return null;
    const credits: { address: string; amountStroops: string }[] = [];
    for (const r of records) {
      if (r.type !== "account_credited" || r.asset_type !== "native") continue;
      if (typeof r.account !== "string" || !G_ADDRESS_PATTERN.test(r.account) || typeof r.amount !== "string") return null;
      credits.push({ address: r.account, amountStroops: parseHorizonBalance(r.amount) });
    }
    return credits;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
