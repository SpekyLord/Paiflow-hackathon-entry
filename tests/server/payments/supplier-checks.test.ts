import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { checkSupplierAccount } from "@/server/wallet-summary/account-check";
import { matchSuppliersToDeployments } from "@/lib/supplier-match";
import type { DeploymentRegistryEntryDTO } from "@/contracts/dto";
import { SIGNER } from "./harness";

const horizon = (status: number, body: unknown = {}) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
const down = vi.fn(async () => {
  throw new TypeError("offline");
}) as unknown as typeof fetch;

describe("supplier account check", () => {
  it("rejects a malformed address without calling Horizon", async () => {
    const fetchImpl = horizon(200);
    expect(await checkSupplierAccount("nope", { fetchImpl })).toEqual({ status: "invalid_format" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("an existing XLM account needs no trustline", async () => {
    expect(await checkSupplierAccount(SIGNER, { fetchImpl: horizon(200, { balances: [] }) })).toEqual({
      status: "exists",
      trustline: "not_required",
    });
  });

  it("a Horizon 404 is not_found", async () => {
    expect(await checkSupplierAccount(SIGNER, { fetchImpl: horizon(404) })).toEqual({ status: "not_found" });
  });

  it.each([
    ["a 500", horizon(500)],
    ["a network failure", down],
  ])("%s is unknown, never invalid or not_found", async (_, fetchImpl) => {
    expect(await checkSupplierAccount(SIGNER, { fetchImpl })).toEqual({ status: "unknown" });
  });

  it("checks the USDC trustline only for a USDC asset", async () => {
    const body = { balances: [{ asset_type: "credit_alphanum4", asset_code: "USDC", asset_issuer: "GISSUER" }] };
    const usdc = { kind: "known", symbol: "USDC" } as const;
    expect(await checkSupplierAccount(SIGNER, { asset: usdc, fetchImpl: horizon(200, body) })).toMatchObject({ trustline: "present" });
    expect(await checkSupplierAccount(SIGNER, { asset: usdc, usdcIssuer: "GOTHER", fetchImpl: horizon(200, body) })).toMatchObject({ trustline: "missing" });
    expect(await checkSupplierAccount(SIGNER, { asset: usdc, fetchImpl: horizon(200, { balances: [] }) })).toMatchObject({ trustline: "missing" });
    expect(await checkSupplierAccount(SIGNER, { asset: usdc, fetchImpl: horizon(200, {}) })).toEqual({ status: "unknown" });
  });
});

const deployment = (id: string, address: string, status: DeploymentRegistryEntryDTO["status"]): DeploymentRegistryEntryDTO =>
  ({
    deploymentId: id,
    template: "budget_split",
    network: "testnet",
    asset: { kind: "native" },
    graphSnapshotSha256: "0".repeat(64),
    splitRecipients: [{ position: 0, label: "Supplies", bps: 10000, address }],
    conditionNodeId: null,
    deadlineAt: null,
    sellerAddress: null,
    buyerAddress: null,
    status,
    registeredAt: "2026-10-25T00:00:00Z",
  }) as unknown as DeploymentRegistryEntryDTO;

describe("supplier to deployment matching", () => {
  const supplier = { id: "s1", name: "Acme", stellarAddress: SIGNER };

  it("finds deployments that already pay the supplier", () => {
    const [match] = matchSuppliersToDeployments([supplier], [deployment("d1", SIGNER, "available"), deployment("d2", "G".padEnd(56, "A"), "available")]);
    expect(match.deployments).toEqual([{ deploymentId: "d1", label: "Supplies", status: "available" }]);
    expect(match.needsNewFlow).toBe(false);
  });

  it("needs a new flow when no deployment pays them or the match is retired", () => {
    expect(matchSuppliersToDeployments([supplier], [])[0].needsNewFlow).toBe(true);
    const [retired] = matchSuppliersToDeployments([supplier], [deployment("d1", SIGNER, "retired")]);
    expect(retired.deployments).toHaveLength(1);
    expect(retired.needsNewFlow).toBe(true);
  });

  it("does not modify its inputs", () => {
    const deployments = [deployment("d1", SIGNER, "available")];
    const before = JSON.stringify(deployments);
    matchSuppliersToDeployments([supplier], deployments);
    expect(JSON.stringify(deployments)).toBe(before);
  });
});
