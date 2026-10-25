import { liveDeps } from "@/server/paiflow/deps";
import { moneyMovementsResponse, unavailableMovementsPort } from "@/server/paiflow/movements";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  return moneyMovementsResponse(await liveDeps(), unavailableMovementsPort, request, await params);
}
