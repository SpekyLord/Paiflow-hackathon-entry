// Shared state vocabularies (FRANCIS-PHASETASK §3.2). Types and pure helpers only: no I/O.

export const PLAN_STATES = [
  'draft',
  'pending_approval',
  'approved',
  'payment_pending',
  'payment_confirmed',
  'distribution_verified',
  'rejected',
  'superseded',
  'mismatch',
  'operator_review',
] as const;
export type PlanState = (typeof PLAN_STATES)[number];

export const DASHBOARD_STATES = [
  'planned',
  'approved',
  'pending',
  'verified_distribution',
  'needs_review',
  'closed',
] as const;
export type DashboardState = (typeof DASHBOARD_STATES)[number];

const DASHBOARD_BY_PLAN: Record<PlanState, DashboardState> = {
  draft: 'planned',
  pending_approval: 'planned',
  approved: 'approved',
  payment_pending: 'pending',
  payment_confirmed: 'pending',
  distribution_verified: 'verified_distribution',
  mismatch: 'needs_review',
  operator_review: 'needs_review',
  rejected: 'closed',
  superseded: 'closed',
};

export function toDashboardState(state: PlanState): DashboardState {
  return DASHBOARD_BY_PLAN[state];
}

export const PAYMENT_ATTEMPT_STATES = [
  'preparing',
  'prepare_failed',
  'prepared',
  'signing',
  'signed_persisted',
  'submitted',
  'success',
  'failed',
  'pending',
  'unknown',
  'rejected',
  'expired_unsigned',
  'operator_review',
  'reconciled',
] as const;
export type PaymentAttemptState = (typeof PAYMENT_ATTEMPT_STATES)[number];

/** Terminal attempt states. Every other state is "non-terminal" for the INV-04 unique index. */
export const TERMINAL_ATTEMPT_STATES: readonly PaymentAttemptState[] = [
  'success',
  'failed',
  'prepare_failed',
  'reconciled',
];

export function isTerminalAttemptState(state: PaymentAttemptState): boolean {
  return TERMINAL_ATTEMPT_STATES.includes(state);
}

export const VERIFICATION_STATES = [
  'not_started',
  'awaiting_tx_final',
  'awaiting_events',
  'verified',
  'mismatch',
  'operator_review',
] as const;
export type VerificationState = (typeof VERIFICATION_STATES)[number];

export const PLAN_ACTIONS = [
  'approve',
  'reject',
  'edit_plan',
  'pay',
  'pay_blocked_until_approved',
  'continue_payment',
  'check_payment',
  'resubmit_same_envelope',
  'refresh_evidence',
  'verify_file',
] as const;
export type PlanAction = (typeof PLAN_ACTIONS)[number];

export const ORG_ROLES = ['owner', 'approver', 'member'] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

// ---- SHOULD tier (protected payment). Declared now so the MVP does not reshape later. ----
export const DEAL_STATES = [
  'draft',
  'terms_pending',
  'ready_to_fund',
  'funding',
  'funded_unindexed',
  'funded_held',
  'delivered',
  'approved',
  'release_requested',
  'release_uncertain',
  'payout_verified',
  'awaiting_refund',
  'refunded_verified',
  'operator_review',
  'cancelled',
] as const;
export type DealState = (typeof DEAL_STATES)[number];

export const RELEASE_ATTEMPT_STATES = [
  'requested',
  'responded',
  'refused',
  'uncertain',
  'verified',
  'mismatch',
  'operator_review',
] as const;
export type ReleaseAttemptState = (typeof RELEASE_ATTEMPT_STATES)[number];

export const AUDIT_ACTION_TYPES = [
  // inherited
  'upload',
  'approve',
  'reject',
  'publish',
  'verify',
  'access',
  // SME (PRD §I.10 plus plan actions, migration 007)
  'plan_create',
  'plan_approve',
  'plan_reject',
  'doc_record',
  'pay_prepare',
  'pay_submit',
  'envelope_payout_verified',
  'operator_review',
  // SHOULD
  'deal_create',
  'terms_accept',
  'fund_prepare',
  'fund_submit',
  'deliver',
  'release_request',
  'release_result',
  'payout_verified',
  'refund_verified',
] as const;
export type AuditActionType = (typeof AUDIT_ACTION_TYPES)[number];
