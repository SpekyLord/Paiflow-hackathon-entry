import { liveDeps } from "@/server/paiflow/deps";
import { respond } from "@/server/paiflow/route-kit";
import { walletSummaryHandler } from "@/server/wallet-summary/summary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  return respond(async () => walletSummaryHandler(await liveDeps(), request));
}
