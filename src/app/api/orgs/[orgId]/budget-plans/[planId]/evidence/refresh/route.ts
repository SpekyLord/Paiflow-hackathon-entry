import { liveDeps } from "@/server/paiflow/deps";
import { refreshEvidenceHandler } from "@/server/paiflow/evidence";
import { respond } from "@/server/paiflow/route-kit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ orgId: string; planId: string }> }) {
  return respond(async () => refreshEvidenceHandler(await liveDeps(), request, await params));
}
