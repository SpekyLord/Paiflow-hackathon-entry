import type { DeploymentRegistryEntryDTO } from "@/contracts/dto";

// ERP-SUP-2: which registry deployments already pay a supplier address, so
// the operator knows whether a new Paiflow flow is needed. Read-only: it
// never edits a deployment. Recipients are fixed per deployment.
export interface SupplierRef {
  id: string;
  name: string;
  stellarAddress: string;
}

export interface SupplierDeploymentMatch {
  supplierId: string;
  deployments: { deploymentId: string; label: string | null; status: DeploymentRegistryEntryDTO["status"] }[];
  /** True when no usable (available or reserved) deployment pays this supplier. */
  needsNewFlow: boolean;
}

export function matchSuppliersToDeployments(
  suppliers: readonly SupplierRef[],
  deployments: readonly DeploymentRegistryEntryDTO[],
): SupplierDeploymentMatch[] {
  return suppliers.map((supplier) => {
    const matched = deployments.flatMap((d) =>
      (d.splitRecipients ?? [])
        .filter((r) => r.address === supplier.stellarAddress)
        .map((r) => ({ deploymentId: d.deploymentId, label: r.label, status: d.status })),
    );
    return {
      supplierId: supplier.id,
      deployments: matched,
      needsNewFlow: !matched.some((m) => m.status === "available" || m.status === "reserved"),
    };
  });
}
