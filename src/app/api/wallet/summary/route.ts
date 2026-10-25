import { liveDeps, requireSession } from "@/server/paiflow/deps";
import { respond } from "@/server/paiflow/route-kit";
import { buildWalletSummary } from "@/server/wallet-summary/summary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  return respond(async () => {
    const deps = await liveDeps();
    const session = await requireSession(deps, request);
    deps.rateLimit("check", session.userId);
    return buildWalletSummary(deps.db, session.userId, deps.now);
  });
}
