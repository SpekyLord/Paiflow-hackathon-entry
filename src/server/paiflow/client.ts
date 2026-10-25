import "server-only";
import { Paiflow } from "@paiflow/sdk";
import type { PaiflowDeployment } from "@paiflow/sdk";
import { readPaiflowConfig } from "@/server/paiflow/config";

const DEPLOYMENT_UUID =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

// `deploymentId` must come from the operator registry row (REQ-DEP-01 AC4),
// never from the browser or from deployment discovery order.
export function paiflowDeployment(deploymentId: string): PaiflowDeployment {
  if (!DEPLOYMENT_UUID.test(deploymentId))
    throw new Error("Invalid Paiflow deployment UUID.");
  const { baseUrl, token } = readPaiflowConfig();
  return new Paiflow({ baseUrl, token }).deployment(deploymentId);
}
