import { liveDeps } from "@/server/paiflow/deps";
import { preparePaymentHandler } from "@/server/paiflow/payment";
import { respond } from "@/server/paiflow/route-kit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ orgId: string; planId: string }> }) {
  return respond(async () => preparePaymentHandler(await liveDeps(), request, await params));
}
