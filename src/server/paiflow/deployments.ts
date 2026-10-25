import "server-only";
import { canonicalSha256, type CanonicalValue } from "@/contracts/canonical";
import type { DeploymentRegistryEntryDTO, SplitRecipientDTO } from "@/contracts/dto";
import { BPS_TOTAL, G_ADDRESS_PATTERN } from "@/contracts/limits";
import { callPaiflow, requireSession, type PaymentDeps } from "@/server/paiflow/deps";
import { fail, readJson, requireSameOrigin, RouteError, UUID } from "@/server/paiflow/route-kit";

// C-06 (REQ-DEP-01): operator registers a Split deployment after checking its
// Paiflow capabilities. Paiflow never returns recipients or bps (CL-12), so
// those stay operator-attested from Shanti's handoff record.

export async function requireOperator(deps: PaymentDeps, request: Request) {
  const session = await requireSession(deps, request);
  if (!session.isOperator) fail("OPERATOR_REQUIRED");
  return session;
}

export async function listDeploymentsHandler(deps: PaymentDeps, request: Request) {
  await requireOperator(deps, request);
  return deps.db.listDeployments();
}

function parseRecipients(value: unknown): SplitRecipientDTO[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 20) fail("VALIDATION", "Split recipients are required.");
  const recipients = (value as unknown[]).map((raw, index) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    if (r.position !== index) fail("VALIDATION", "Recipients must be listed in deployment order from position 0.");
    if (typeof r.address !== "string" || !G_ADDRESS_PATTERN.test(r.address)) fail("VALIDATION", "Invalid recipient address.");
    if (!Number.isInteger(r.bps) || (r.bps as number) <= 0) fail("BPS_TOTAL_INVALID");
    const label = r.label === null || r.label === undefined ? null : String(r.label).slice(0, 80);
    return { position: index, address: r.address as string, bps: r.bps as number, label };
  });
  if (recipients.reduce((sum, r) => sum + r.bps, 0) !== BPS_TOTAL) fail("BPS_TOTAL_INVALID");
  if (new Set(recipients.map((r) => r.address)).size !== recipients.length) fail("DUPLICATE_RECIPIENT");
  return recipients;
}

export async function registerDeploymentHandler(deps: PaymentDeps, request: Request): Promise<DeploymentRegistryEntryDTO> {
  requireSameOrigin(request);
  const session = await requireOperator(deps, request);
  const body = await readJson(request);
  const deploymentId = typeof body.deploymentId === "string" && UUID.test(body.deploymentId) ? body.deploymentId : fail("VALIDATION", "Invalid deployment UUID.");
  if (body.template !== "budget_split") fail("VALIDATION", "Only budget_split deployments are part of the MVP.");
  const splitRecipients = parseRecipients(body.splitRecipients);

  // CL-11: exactly one available Split may match; register sequentially.
  const existing = await deps.db.listDeployments();
  if (existing.some((d) => d.deploymentId === deploymentId)) fail("STATE_CONFLICT", "This deployment is already registered.");
  if (existing.some((d) => d.template === "budget_split" && d.status === "available"))
    fail("AMBIGUOUS_DEPLOYMENT_MATCH", "Another Split deployment is still available. Reserve or retire it first.");

  const { data: caps } = await callPaiflow(() => deps.paiflow(deploymentId).capabilities.get());
  const problems = [
    caps.network !== "testnet" && "network",
    caps.triggerType !== "deposit" && "triggerType",
    caps.inputAsset?.kind !== "native" && "inputAsset",
    caps.operations.execute.status === "unsupported" && "execute",
  ].filter(Boolean) as string[];

  // No credentials are in a capability response; strip undefined fields for hashing.
  const capabilitySnapshot = JSON.parse(JSON.stringify(caps)) as CanonicalValue;
  const graphSnapshotSha256 = await canonicalSha256({
    deploymentId,
    template: "budget_split",
    capabilities: capabilitySnapshot,
    splitRecipients: splitRecipients as unknown as CanonicalValue,
  });
  const result = await deps.db.registerDeployment({
    operatorUserId: session.userId,
    deploymentId,
    template: "budget_split",
    network: "testnet",
    asset: { kind: "native" },
    graphSnapshotSha256,
    splitRecipients,
    conditionNodeId: null,
    deadlineAt: null,
    sellerAddress: null,
    buyerAddress: null,
    capabilitySnapshot: { capabilities: capabilitySnapshot, recipientsSource: "operator_attested", problems },
    status: problems.length ? "unusable" : "available",
  });
  if (!result.ok) throw new RouteError(result.code);
  if (problems.length) fail("CAPABILITY_MISMATCH", `Capability check failed: ${problems.join(", ")}. Registered as unusable.`);
  return result.value;
}
