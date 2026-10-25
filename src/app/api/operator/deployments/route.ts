import { liveDeps } from "@/server/paiflow/deps";
import { listDeploymentsHandler, registerDeploymentHandler } from "@/server/paiflow/deployments";
import { respond } from "@/server/paiflow/route-kit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  return respond(async () => listDeploymentsHandler(await liveDeps(), request));
}

export async function POST(request: Request) {
  return respond(async () => registerDeploymentHandler(await liveDeps(), request));
}
