import { FIXTURE_MARKER, splitDeploymentFixture } from "@/contracts/fixtures";
import type { DeploymentRegistryEntryDTO, OperatorReviewDTO } from "@/contracts/dto";
import type { ResolveReviewRequest } from "@/contracts/api";
import type { SafeError } from "@/contracts/controllers";
import { BPS_TOTAL } from "@/contracts/limits";

// Fixture registry and review data for the mock operator console.
const NOW = "2026-10-25T05:00:00Z";

export function operatorFixtures(): { deployments: DeploymentRegistryEntryDTO[]; reviews: OperatorReviewDTO[] } {
  const split = splitDeploymentFixture("reserved");
  return {
    deployments: [
      {
        deploymentId: split.deploymentId,
        template: "budget_split",
        network: "testnet",
        asset: split.asset,
        graphSnapshotSha256: "0".repeat(63) + "5",
        splitRecipients: split.recipients,
        conditionNodeId: null,
        deadlineAt: null,
        sellerAddress: null,
        buyerAddress: null,
        status: split.status,
        registeredAt: NOW,
      },
    ],
    reviews: [
      {
        reviewId: "00000000-0000-4000-8000-000000000030",
        scope: "payment_attempt",
        refId: "00000000-0000-4000-8000-000000000005",
        reason: `${FIXTURE_MARKER} status checks exhausted without a final result`,
        openedAt: NOW,
        resolvedAt: null,
        outcome: null,
      },
    ],
  };
}

// Mirrors the server's registry rules: Split recipients are distinct and total 10,000 bps.
export function validateRegistration(
  input: Omit<DeploymentRegistryEntryDTO, "status" | "registeredAt">,
): SafeError | null {
  if (input.template !== "budget_split") return null;
  const recipients = input.splitRecipients ?? [];
  if (recipients.reduce((sum, r) => sum + r.bps, 0) !== BPS_TOTAL)
    return { code: "BPS_TOTAL_INVALID", message: "Split shares must total 100%." };
  if (new Set(recipients.map((r) => r.address)).size !== recipients.length)
    return { code: "DUPLICATE_RECIPIENT", message: "Each envelope needs its own address." };
  return null;
}

export function validateResolution(input: ResolveReviewRequest): SafeError | null {
  return input.justification.trim()
    ? null
    : { code: "VALIDATION", message: "A justification is required." };
}
