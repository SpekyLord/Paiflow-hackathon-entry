import { isPaiflowConfigured } from "@/server/paiflow/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Reports configuration only; it never returns the token, base URL or any
// deployment detail. The session check is added once Francis's auth (F-03) lands.
export async function GET() {
  const paiflowConfigured = isPaiflowConfigured();
  return Response.json({
    data: { paiflowConfigured, network: paiflowConfigured ? "testnet" : null },
  });
}
