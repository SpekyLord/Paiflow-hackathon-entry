// Canonical honest wording (FRANCIS-PHASETASK §3.2). Shanti may style it but must not change its meaning.
// Never use "Distributed", "Paid" or "Refunded" before verification. Never say "tampered".

import type { DashboardState } from './states';

export const STATE_COPY = {
  planned: (k: number, n: number) => `Planned: waiting for approvals (${k} of ${n})`,
  approved: 'Approved: ready for the authorised signer',
  paymentPending: 'Payment pending',
  paymentConfirmed: (k: number, n: number) => `Payment confirmed; ${k} of ${n} payouts verified`,
  envelopePaidVerified: (label: string) => `${label} paid — verified`,
  distributionVerified: 'Distribution verified',
  outcomeUnknown: 'Payment outcome unknown. Do not pay again.',
  mismatch: 'Evidence mismatch — under review',
  confirmedNotVerified: 'Transaction confirmed; payout not yet verified',
  phpPlanningFigure: 'planning figure (PHP), not a crypto amount',
  payBlocked: (k: number, n: number) => `Waiting for all approvers (${k} of ${n})`,
} as const;

export const DASHBOARD_LABEL: Record<DashboardState, string> = {
  planned: 'Planned',
  approved: 'Approved',
  pending: 'Pending',
  verified_distribution: 'Verified distribution',
  needs_review: 'Needs review',
  closed: 'Closed',
};

export const TAMPER_CHECK_COPY = {
  match: (record: string, time: string) =>
    `Matches ${record} recorded ${time}. This confirms the bytes are identical. It does not confirm quality, authorship or that delivery was truthful.`,
  noMatch: (record: string) =>
    `Does not match ${record}. The file differs from what was recorded. This alone does not prove tampering.`,
} as const;

export const NONRESPONSE_REFUND =
  'If the payer does not approve before the deadline, Paiflow refunds the payer even if the payee delivered.'; // SHOULD

export const HASH_LABELS = {
  stellarTxHash: 'Stellar transaction hash',
  auditHash: 'CYFAI audit hash',
  ledgerBlockHash: 'CYFAI ledger hash',
  sha256: 'SHA-256',
} as const;

export const EXPLORER_LABEL = 'Stellar Expert (testnet)';
