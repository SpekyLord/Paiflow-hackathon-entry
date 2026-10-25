// Fixtures for mocks and UI work (FRANCIS-PHASETASK §3.9). Every title/purpose starts with "[FIXTURE]".
// Fixture UUIDs start with 00000000-0000-4000-8000-; hashes are 000…0001-style and cannot resolve on an explorer;
// G-addresses are syntactically valid but not real accounts. Pure data: no I/O, no server imports.

import { ERROR_HTTP_STATUS, DEFAULT_ERROR_MESSAGE, type ApiErrorBody, type ErrorCode } from '../errors';
import { splitShares } from '../split';
import { PLAN_STATES, toDashboardState, type PlanAction, type PlanState, type VerificationState } from '../states';
import type {
  BudgetPlanDetailDTO,
  EnvelopeDTO,
  GAddress,
  OrgDocumentDTO,
  PaymentAttemptViewDTO,
  PaymentReviewDTO,
  PlanApprovalDTO,
  SessionDTO,
  SplitDeploymentDTO,
  VerificationDTO,
  VerifyFileResultDTO,
  WalletSummaryDTO,
} from '../dto';

export const FIXTURE_MARKER = '[FIXTURE]';
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const hash = (n: number) => n.toString(16).padStart(64, '0');
const addr = (c: string): GAddress => `G${c.repeat(54)}2`; // matches ^G[A-Z2-7]{55}$, not a real account
const NOW = '2026-10-25T05:00:00Z';

export const FIXTURE_IDS = {
  org: uuid(1),
  plan: uuid(2),
  version: uuid(3),
  deployment: uuid(4),
  attempt: uuid(5),
  user: uuid(10),
  approver1: uuid(11),
  approver2: uuid(12),
  operator: uuid(13),
  document: uuid(20),
} as const;

const RECIPIENTS = [
  { position: 0, label: 'Operations', bps: 5000, address: addr('A') },
  { position: 1, label: 'Payroll', bps: 3000, address: addr('B') },
  { position: 2, label: 'Supplies', bps: 2000, address: addr('C') },
] as const;
const TOTAL = '10000000'; // 1 XLM

export function splitDeploymentFixture(status: 'available' | 'reserved' = 'available'): SplitDeploymentDTO {
  return {
    deploymentId: FIXTURE_IDS.deployment,
    network: 'testnet',
    asset: { kind: 'native' },
    recipients: RECIPIENTS.map((r) => ({ position: r.position, address: r.address, bps: r.bps, label: r.label })),
    status,
  };
}

function verification(
  kind: VerificationDTO['kind'],
  state: VerificationState,
  address: GAddress,
  expected: string,
  n: number,
): VerificationDTO {
  const done = state === 'verified' || state === 'mismatch';
  return {
    kind,
    state,
    stellarTxHash: done || state === 'awaiting_events' ? hash(100 + n) : null,
    expectedAddress: address,
    expectedAmountStroops: expected,
    observedAmountStroops: state === 'verified' ? expected : state === 'mismatch' ? '1' : null,
    eventIds: done ? [`${FIXTURE_MARKER}-event-${n}`] : [],
    checkedAt: done ? NOW : null,
    note: state === 'mismatch' ? `${FIXTURE_MARKER} observed amount differs from expected` : null,
  };
}

/** How many envelopes are verified for each plan state; null = not applicable. */
function verifiedCount(state: PlanState, partial: boolean): number {
  if (state === 'distribution_verified') return 3;
  if (state === 'payment_confirmed') return partial ? 2 : 0;
  if (state === 'mismatch') return 1;
  return 0;
}

export function planDetailFixture(state: PlanState = 'pending_approval', opts: { partial?: boolean } = {}): BudgetPlanDetailDTO {
  const shares = splitShares(TOTAL, RECIPIENTS);
  const paid = ['payment_pending', 'payment_confirmed', 'distribution_verified', 'mismatch', 'operator_review'].includes(state);
  const verified = verifiedCount(state, opts.partial ?? false);

  const envelopes: EnvelopeDTO[] = RECIPIENTS.map((r, i) => {
    let payout: VerificationDTO | null = null;
    if (state === 'payment_confirmed' || state === 'distribution_verified' || state === 'mismatch') {
      const vs: VerificationState =
        i < verified ? 'verified' : state === 'mismatch' && i === verified ? 'mismatch' : 'awaiting_events';
      payout = verification('envelope_payout', vs, r.address, shares[i].shareStroops, i);
    }
    return {
      position: r.position,
      label: r.label,
      bps: r.bps,
      recipientAddress: r.address,
      expectedShareStroops: shares[i].shareStroops,
      planningPhpCentavos: i === 0 ? '5000000' : null,
      payout,
    };
  });

  const approverDecisions: PlanApprovalDTO['decision'][] =
    state === 'draft'
      ? ['pending', 'pending']
      : state === 'pending_approval'
        ? ['approved', 'pending']
        : state === 'rejected'
          ? ['approved', 'rejected']
          : ['approved', 'approved'];
  const approvalsDetail: PlanApprovalDTO[] = approverDecisions.map((decision, i) => ({
    approverName: `${FIXTURE_MARKER} Approver ${i + 1}`,
    isViewer: i === 0,
    decision,
    decidedAt: decision === 'pending' ? null : NOW,
    reason: decision === 'rejected' ? `${FIXTURE_MARKER} needs a smaller total` : null,
  }));
  const approvedCount = approverDecisions.filter((d) => d === 'approved').length;

  let payment: PaymentAttemptViewDTO | null = null;
  if (paid) {
    payment = {
      attemptId: FIXTURE_IDS.attempt,
      state: state === 'payment_pending' ? 'submitted' : state === 'operator_review' ? 'operator_review' : 'success',
      originalTxHash: hash(200),
      expiresAt: null,
      submittedAt: NOW,
      finalStatus: state === 'payment_pending' ? 'PENDING' : state === 'operator_review' ? 'UNKNOWN' : 'SUCCESS',
      ledger: state === 'payment_pending' || state === 'operator_review' ? null : 1,
      hasSignedEnvelope: true,
      lastCheckedAt: NOW,
    };
  }

  const allowedActions: PlanAction[] = [];
  if (state === 'pending_approval') allowedActions.push('approve', 'reject', 'edit_plan', 'pay_blocked_until_approved');
  if (state === 'approved') allowedActions.push('pay', 'edit_plan');
  if (state === 'draft' || state === 'rejected') allowedActions.push('edit_plan');
  if (state === 'payment_pending') allowedActions.push('check_payment', 'refresh_evidence');
  if (state === 'payment_confirmed') allowedActions.push('refresh_evidence');
  allowedActions.push('verify_file');

  return {
    planId: FIXTURE_IDS.plan,
    orgId: FIXTURE_IDS.org,
    version: 1,
    purpose: `${FIXTURE_MARKER} October operating budget`,
    state,
    dashboardState: toDashboardState(state),
    totalStroops: TOTAL,
    asset: { kind: 'native' },
    approvals: { approved: approvedCount, required: 2 },
    updatedAt: NOW,
    versionId: FIXTURE_IDS.version,
    planSha256: hash(1),
    ledgerBlockId: 1,
    deployment: { id: FIXTURE_IDS.deployment, network: 'testnet', asset: { kind: 'native' } },
    signer: { displayName: `${FIXTURE_MARKER} Owner`, address: addr('S') },
    envelopes,
    approvalsDetail,
    payment,
    paymentReceipt:
      state === 'payment_confirmed' || state === 'distribution_verified' || state === 'mismatch'
        ? verification('payment_receipt', 'verified', addr('S'), TOTAL, 99)
        : null,
    payoutsVerified: { verified, total: 3 },
    versions: [{ versionId: FIXTURE_IDS.version, version: 1, planSha256: hash(1), createdAt: NOW, superseded: state === 'superseded' }],
    timeline: [
      { at: NOW, kind: 'plan_create', actorRole: 'owner', summary: `${FIXTURE_MARKER} Plan created`, sha256: hash(1), auditHash: hash(300) },
    ],
    viewerRoles: ['owner', 'signer'],
    allowedActions,
    serverTime: NOW,
  };
}

export function allPlanStateFixtures(): BudgetPlanDetailDTO[] {
  return [...PLAN_STATES].map((s) => planDetailFixture(s, { partial: s === 'payment_confirmed' }));
}

export function paymentReviewFixture(outcome: 'created' | 'existing' = 'created'): PaymentReviewDTO {
  const shares = splitShares(TOTAL, RECIPIENTS);
  return {
    attemptId: FIXTURE_IDS.attempt,
    network: 'testnet',
    networkPassphrase: 'Test SDF Network ; September 2015',
    xdr: `${FIXTURE_MARKER}-not-a-real-xdr`,
    originalTxHash: hash(200),
    expiresAt: '2026-10-25T05:10:00Z',
    amountStroops: TOTAL,
    asset: { kind: 'native' },
    feeStroops: '100',
    deploymentId: FIXTURE_IDS.deployment,
    recipients: RECIPIENTS.map((r, i) => ({ label: r.label, address: r.address, expectedShareStroops: shares[i].shareStroops })),
    outcome,
  };
}

export function walletSummaryFixture(kind: 'ok' | 'unavailable' | 'empty' = 'ok'): WalletSummaryDTO {
  const base: WalletSummaryDTO = {
    network: 'testnet',
    binding: { address: addr('S'), verifiedAt: NOW },
    balance: { state: 'available', xlmStroops: '100000000', asOf: NOW },
    plans: [{ orgId: FIXTURE_IDS.org, planId: FIXTURE_IDS.plan, purpose: `${FIXTURE_MARKER} October operating budget`, dashboardState: 'verified_distribution', role: 'signer' }],
    escrow: [],
    verifiedPayouts: { receivedStroops: '0', refundedStroops: '0' },
    history: [
      {
        kind: 'budget_payment',
        refId: FIXTURE_IDS.plan,
        amountStroops: TOTAL,
        stellarTxHash: hash(200),
        explorerUrl: `https://stellar.expert/explorer/testnet/tx/${hash(200)}`,
        verification: 'verified',
        at: NOW,
      },
    ],
  };
  if (kind === 'unavailable') return { ...base, balance: { state: 'unavailable', asOf: NOW } }; // never 0
  if (kind === 'empty') return { ...base, binding: null, plans: [], history: [], balance: { state: 'unavailable', asOf: NOW } };
  return base;
}

export function orgDocumentsFixture(): OrgDocumentDTO[] {
  return [
    {
      documentId: FIXTURE_IDS.document,
      kind: 'contract',
      sha256: hash(400),
      sizeBytes: 1024,
      mediaType: 'application/pdf',
      originalFilename: `${FIXTURE_MARKER} supplier-contract.pdf`,
      uploadedAt: NOW,
      uploadedBy: `${FIXTURE_MARKER} Owner`,
      ledgerBlockId: 2,
    },
  ];
}

export function verifyFileFixture(match: boolean): VerifyFileResultDTO {
  return {
    target: { kind: 'org_document', id: FIXTURE_IDS.document, label: `${FIXTURE_MARKER} supplier-contract.pdf` },
    recordedAt: NOW,
    candidateSha256: match ? hash(400) : hash(401),
    recordedSha256: hash(400),
    match,
  };
}

export function sessionFixture(roles: ('owner' | 'approver' | 'member' | 'operator')[] = ['owner']): SessionDTO {
  const orgRole = roles.find((r): r is 'owner' | 'approver' | 'member' => r !== 'operator');
  return {
    userId: FIXTURE_IDS.user,
    displayName: `${FIXTURE_MARKER} User`,
    isOperator: roles.includes('operator'),
    binding: { address: addr('S'), verifiedAt: NOW },
    orgs: orgRole ? [{ orgId: FIXTURE_IDS.org, name: `${FIXTURE_MARKER} Sample SME`, role: orgRole }] : [],
  };
}

export function errorFixture(code: ErrorCode): { status: number; body: ApiErrorBody } {
  return { status: ERROR_HTTP_STATUS[code], body: { error: { code, message: DEFAULT_ERROR_MESSAGE[code] } } };
}
