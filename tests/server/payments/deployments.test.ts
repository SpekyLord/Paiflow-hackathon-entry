import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { listDeploymentsHandler, registerDeploymentHandler } from "@/server/paiflow/deployments";
import { respond } from "@/server/paiflow/route-kit";
import { DEPLOYMENT, jsonRequest, makeHarness, ok, read, sdk, USER } from "./harness";

const operator = { userId: USER, isOperator: true };
const recipients = [
  { position: 0, address: `G${"A".repeat(54)}2`, bps: 5000, label: "Operations" },
  { position: 1, address: `G${"B".repeat(54)}2`, bps: 3000, label: "Payroll" },
  { position: 2, address: `G${"C".repeat(54)}2`, bps: 2000, label: "Supplies" },
];
const input = { deploymentId: DEPLOYMENT, template: "budget_split", splitRecipients: recipients };
const caps = (patch: Record<string, unknown> = {}) =>
  sdk({
    deploymentId: DEPLOYMENT,
    network: "testnet",
    configurationSource: "deployment_snapshot",
    triggerType: "deposit",
    inputAsset: { kind: "native" },
    operations: { execute: { status: "supported", authentication: "deployment_token", requirements: [], nodeIds: [] } },
    ...patch,
  });

function setup(session = operator) {
  const h = makeHarness(session);
  h.db.listDeployments.mockResolvedValue([]);
  h.db.registerDeployment.mockImplementation(async (i) => ok({ ...i, status: i.status, registeredAt: "2026-10-25T05:00:00Z" }));
  h.paiflow.capabilities.get.mockResolvedValue(caps());
  const register = (body: unknown = input) =>
    respond(() => registerDeploymentHandler(h.deps, jsonRequest("/api/operator/deployments", body))).then(read);
  return { ...h, register };
}

describe("POST /api/operator/deployments", () => {
  it("registers a Testnet native deposit Split as available", async () => {
    const h = setup();
    const res = await h.register();
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ deploymentId: DEPLOYMENT, status: "available", splitRecipients: recipients });
    const call = h.db.registerDeployment.mock.calls[0][0];
    expect(call.graphSnapshotSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(call.capabilitySnapshot.recipientsSource).toBe("operator_attested");
    expect(JSON.stringify(call)).not.toMatch(/pf[dk]_/);
  });

  it.each([
    ["mainnet", { network: "mainnet" }],
    ["webhook trigger", { triggerType: "webhook" }],
    ["USDC input", { inputAsset: { kind: "known", symbol: "USDC" } }],
    ["unsupported execute", { operations: { execute: { status: "unsupported", authentication: "deployment_token", requirements: [], nodeIds: [] } } }],
  ])("registers %s as unusable and returns 422 CAPABILITY_MISMATCH", async (_, patch) => {
    const h = setup();
    h.paiflow.capabilities.get.mockResolvedValue(caps(patch));
    const res = await h.register();
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("CAPABILITY_MISMATCH");
    expect(h.db.registerDeployment.mock.calls[0][0].status).toBe("unusable");
  });

  it("flags a second available Split (CL-11) before calling Paiflow", async () => {
    const h = setup();
    h.db.listDeployments.mockResolvedValue([{ deploymentId: "00000000-0000-4000-8000-000000000099", template: "budget_split", status: "available" }]);
    const res = await h.register();
    expect(res.body.error.code).toBe("AMBIGUOUS_DEPLOYMENT_MATCH");
    expect(h.sdkCalls()).toBe(0);
  });

  it.each([
    ["bps not totalling 10000", { splitRecipients: [{ ...recipients[0], bps: 4000 }, recipients[1], recipients[2]] }, "BPS_TOTAL_INVALID"],
    ["duplicate addresses", { splitRecipients: recipients.map((r) => ({ ...r, address: recipients[0].address })) }, "DUPLICATE_RECIPIENT"],
    ["out-of-order positions", { splitRecipients: [recipients[1], recipients[0], recipients[2]] }, "VALIDATION"],
    ["a non-UUID id", { deploymentId: "CABC" }, "VALIDATION"],
    ["an escrow template", { template: "commission_escrow" }, "VALIDATION"],
  ])("refuses %s without calling Paiflow", async (_, patch, code) => {
    const h = setup();
    const res = await h.register({ ...input, ...patch });
    expect(res.body.error.code).toBe(code);
    expect(h.sdkCalls()).toBe(0);
    expect(h.db.registerDeployment).not.toHaveBeenCalled();
  });

  it("requires an operator", async () => {
    const h = setup({ userId: USER, isOperator: false });
    expect((await h.register()).status).toBe(403);
    const anonymous = makeHarness(null);
    const res = await respond(() => listDeploymentsHandler(anonymous.deps, new Request("http://localhost:3000/x"))).then(read);
    expect(res.status).toBe(401);
    expect(h.sdkCalls()).toBe(0);
  });
});
