// Browser-visible DTOs (FRANCIS-PHASETASK §3.4). Authoritative definitions; types only.
// Hash field names never mix kinds: stellarTxHash (explorer-checkable), sha256 (files, plans, terms),
// auditHash (CYFER transactions.tx_hash, NOT Stellar), ledgerBlockHash (CYFER application ledger, NOT Stellar).
// Money is `…Stroops: string`; PHP planning figures are integer centavos in a SEPARATE field (D-08).

import type {
  AuditActionType,
  DashboardState,
  DealState,
  OrgRole,
  PaymentAttemptState,
  PlanAction,
  PlanState,
  VerificationState,
} from './states';

export type Sha256Hex = string;
export type StellarTxHash = string;
export type GAddress = string;
export type IsoUtc = string;

export type AssetRef = { kind: 'native' } | { kind: 'known'; symbol: 'USDC' }; // USDC is STRETCH only

export interface SessionDTO {
  userId: string;
  displayName: string;
  isOperator: boolean;
  binding: { address: GAddress; verifiedAt: IsoUtc } | null;
  orgs: { orgId: string; name: string; role: OrgRole }[];
}

// ---------- MVP: budget plans ----------
export interface SplitRecipientDTO {
  position: number;
  address: GAddress;
  bps: number;
  label: string | null;
}

export interface SplitDeploymentDTO {
  deploymentId: string;
  network: 'testnet';
  asset: AssetRef;
  recipients: SplitRecipientDTO[]; // deployment order
  status: 'available' | 'reserved';
}

export interface VerificationDTO {
  kind: 'payment_receipt' | 'envelope_payout' | 'release_payout' | 'refund_payout';
  state: VerificationState;
  stellarTxHash: StellarTxHash | null;
  expectedAddress: GAddress;
  expectedAmountStroops: string;
  observedAmountStroops: string | null;
  eventIds: string[];
  checkedAt: IsoUtc | null;
  note: string | null;
}

export interface EnvelopeDTO {
  position: number;
  label: string;
  bps: number;
  recipientAddress: GAddress;
  expectedShareStroops: string; // from splitShares(); remainder on the last envelope
  planningPhpCentavos: string | null; // integer string, separate from crypto
  payout: VerificationDTO | null; // kind 'envelope_payout'
}

export interface PlanApprovalDTO {
  approverName: string;
  isViewer: boolean;
  decision: 'pending' | 'approved' | 'rejected';
  decidedAt: IsoUtc | null;
  reason: string | null;
}

// Never contains preparedXdr / signedXdr / historyRequestId / request ids.
export interface PaymentAttemptViewDTO {
  attemptId: string;
  state: PaymentAttemptState;
  originalTxHash: StellarTxHash | null;
  expiresAt: IsoUtc | null;
  submittedAt: IsoUtc | null;
  finalStatus: 'SUCCESS' | 'FAILED' | 'PENDING' | 'UNKNOWN' | 'REJECTED' | 'NOT_FOUND' | null; // NOT_FOUND = HTTP 404 lookup
  ledger: number | null;
  hasSignedEnvelope: boolean;
  lastCheckedAt: IsoUtc | null;
}

export interface TimelineEntryDTO {
  at: IsoUtc;
  kind: AuditActionType;
  actorRole: string;
  summary: string;
  stellarTxHash?: StellarTxHash;
  sha256?: Sha256Hex;
  auditHash?: string;
  ledgerBlockId?: number;
}

export interface BudgetPlanSummaryDTO {
  planId: string;
  orgId: string;
  version: number;
  purpose: string;
  state: PlanState;
  dashboardState: DashboardState;
  totalStroops: string;
  asset: AssetRef;
  approvals: { approved: number; required: number };
  updatedAt: IsoUtc;
}

export type ViewerRole = 'owner' | 'approver' | 'member' | 'signer' | 'operator';

export interface BudgetPlanDetailDTO extends BudgetPlanSummaryDTO {
  versionId: string;
  planSha256: Sha256Hex;
  ledgerBlockId: number | null;
  deployment: { id: string; network: 'testnet'; asset: AssetRef };
  signer: { displayName: string; address: GAddress };
  envelopes: EnvelopeDTO[];
  approvalsDetail: PlanApprovalDTO[];
  payment: PaymentAttemptViewDTO | null;
  paymentReceipt: VerificationDTO | null; // H.1 + H.2 for the Split payment
  payoutsVerified: { verified: number; total: number };
  versions: { versionId: string; version: number; planSha256: Sha256Hex; createdAt: IsoUtc; superseded: boolean }[];
  timeline: TimelineEntryDTO[];
  viewerRoles: ViewerRole[];
  allowedActions: PlanAction[];
  serverTime: IsoUtc;
}

export interface CreatePlanInput {
  purpose: string;
  totalStroops: string;
  signerUserId: string;
  envelopes: {
    position: number;
    label: string;
    bps: number;
    recipientAddress: GAddress;
    planningPhpCentavos: string | null;
  }[];
  attachmentDocumentIds?: string[];
}

export interface PaymentReviewDTO {
  attemptId: string;
  network: 'testnet';
  networkPassphrase: string;
  xdr: string; // unsigned; returned ONLY to the owning signer while unexpired (CL-06)
  originalTxHash: StellarTxHash;
  expiresAt: IsoUtc;
  amountStroops: string;
  asset: AssetRef;
  feeStroops: string | null;
  deploymentId: string;
  recipients: { label: string; address: GAddress; expectedShareStroops: string }[]; // what the signer consents to
  outcome: 'created' | 'existing';
}

// ---------- MVP: documents and tamper check ----------
export type OrgDocumentKind = 'contract' | 'invoice' | 'receipt' | 'plan_attachment' | 'other';

export interface OrgDocumentDTO {
  documentId: string;
  kind: OrgDocumentKind;
  sha256: Sha256Hex;
  sizeBytes: number;
  mediaType: string;
  originalFilename: string;
  uploadedAt: IsoUtc;
  uploadedBy: string;
  ledgerBlockId: number | null;
}

export interface VerifyFileResultDTO {
  target: { kind: 'org_document' | 'plan_version' | 'deliverable_version'; id: string; label: string };
  recordedAt: IsoUtc;
  candidateSha256: Sha256Hex;
  recordedSha256: Sha256Hex;
  match: boolean;
}

// ---------- MVP: wallet ----------
export interface WalletSummaryDTO {
  network: 'testnet';
  binding: { address: GAddress; verifiedAt: IsoUtc } | null;
  balance: { state: 'available'; xlmStroops: string; asOf: IsoUtc } | { state: 'unavailable'; asOf: IsoUtc };
  plans: {
    orgId: string;
    planId: string;
    purpose: string;
    dashboardState: DashboardState;
    role: 'owner' | 'approver' | 'signer' | 'envelope_recipient';
  }[];
  escrow: { dealId: string; title: string; state: DealState; amountStroops: string; depositVerified: boolean }[]; // SHOULD; [] in MVP
  verifiedPayouts: { receivedStroops: string; refundedStroops: string }; // verified only
  history: {
    kind: 'budget_payment' | 'envelope_payout' | 'deposit' | 'release' | 'refund';
    refId: string;
    amountStroops: string;
    stellarTxHash: StellarTxHash;
    explorerUrl: string;
    verification: VerificationState;
    at: IsoUtc;
  }[];
}

// ---------- MVP: operator ----------
export interface DeploymentRegistryEntryDTO {
  deploymentId: string;
  template: 'budget_split' | 'commission_escrow' | (string & {});
  network: 'testnet';
  asset: AssetRef;
  graphSnapshotSha256: Sha256Hex;
  splitRecipients: SplitRecipientDTO[] | null;
  conditionNodeId: string | null;
  deadlineAt: IsoUtc | null;
  sellerAddress: GAddress | null;
  buyerAddress: GAddress | null;
  status: 'available' | 'reserved' | 'retired' | 'unusable';
  registeredAt: IsoUtc;
}

export interface OperatorReviewDTO {
  reviewId: string;
  scope: 'payment_attempt' | 'verification' | 'plan' | 'release_attempt' | 'deal';
  refId: string;
  reason: string;
  openedAt: IsoUtc;
  resolvedAt: IsoUtc | null;
  outcome: string | null;
}

// ---------- SHOULD: protected payment ----------
// DealSummaryDTO, DealDetailDTO, TermsDTO, DeliverableVersionDTO, ApprovalDTO, ReleaseViewDTO, DeploymentMatchDTO:
// fixed at the start of F-30 via CR (PRD §E.3–§E.8).
