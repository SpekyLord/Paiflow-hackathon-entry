import { requireUser } from "@/server/auth/guards";
import { isPaiflowConfigured } from "@/server/paiflow/config";
import { respond } from "@/server/paiflow/route-kit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Signed-in users only (contract §3.5). Reports configuration only; it never
// returns the token, base URL or any deployment detail.
export async function GET() {
  return respond(async () => {
    await requireUser();
    const paiflowConfigured = isPaiflowConfigured();
    return { paiflowConfigured, network: paiflowConfigured ? "testnet" : null };
  });
}
