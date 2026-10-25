import "server-only";
import type { AssetRef } from "@/contracts/dto";
import { G_ADDRESS_PATTERN } from "@/contracts/limits";
import { HORIZON_TESTNET } from "@/server/wallet-summary/horizon";

// ERP-SUP-1: label a supplier's Stellar address. It is information only: the
// result never blocks a record, and a Horizon failure is "unknown", never
// "not found" or "invalid". XLM needs no trustline; only USDC (stretch) does.
const TIMEOUT_MS = 5_000;

export type AccountCheck =
  | { status: "invalid_format" }
  | { status: "not_found" } // Horizon answered 404: no such account on Testnet
  | { status: "unknown" } // Horizon unreachable, slow or odd; say nothing more
  | { status: "exists"; trustline: "not_required" | "present" | "missing" };

interface HorizonBalance {
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
}

export async function checkSupplierAccount(
  address: string,
  opts: { asset?: AssetRef; usdcIssuer?: string; fetchImpl?: typeof fetch } = {},
): Promise<AccountCheck> {
  if (!G_ADDRESS_PATTERN.test(address)) return { status: "invalid_format" };
  const fetchImpl = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(`${HORIZON_TESTNET}/accounts/${address}`, {
      signal: controller.signal,
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (res.status === 404) return { status: "not_found" };
    if (!res.ok) return { status: "unknown" };
    const asset = opts.asset;
    if (!asset || asset.kind === "native") return { status: "exists", trustline: "not_required" };
    const body = (await res.json()) as { balances?: HorizonBalance[] };
    if (!Array.isArray(body.balances)) return { status: "unknown" };
    const has = body.balances.some(
      (b) =>
        b.asset_code === asset.symbol &&
        (opts.usdcIssuer === undefined || b.asset_issuer === opts.usdcIssuer),
    );
    return { status: "exists", trustline: has ? "present" : "missing" };
  } catch {
    return { status: "unknown" };
  } finally {
    clearTimeout(timer);
  }
}
