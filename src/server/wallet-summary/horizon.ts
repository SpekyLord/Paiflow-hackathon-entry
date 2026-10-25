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
