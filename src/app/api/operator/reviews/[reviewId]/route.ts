import { liveDeps } from "@/server/paiflow/deps";
import { respond } from "@/server/paiflow/route-kit";
import { resolveReviewHandler } from "@/server/paiflow/reviews";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  return respond(async () => resolveReviewHandler(await liveDeps(), request, (await params).reviewId));
}
