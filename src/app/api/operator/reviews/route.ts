import { liveDeps } from "@/server/paiflow/deps";
import { respond } from "@/server/paiflow/route-kit";
import { listReviewsHandler } from "@/server/paiflow/reviews";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  return respond(async () => listReviewsHandler(await liveDeps(), request));
}
