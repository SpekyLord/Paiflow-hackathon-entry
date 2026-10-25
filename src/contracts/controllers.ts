// Headless controller interface: Carlos implements (src/client/controllers), Shanti consumes (FRANCIS-PHASETASK §3.7).
// Types only. Hooks never render UI; buttons stay disabled while `busy` (the server is still the real guard).

import type {
  BudgetPlanDetailDTO,
  DeploymentRegistryEntryDTO,
  GAddress,
  IsoUtc,
  OperatorReviewDTO,
  PaymentAttemptViewDTO,
  PaymentReviewDTO,
  SessionDTO,
  WalletSummaryDTO,
} from './dto';
import type { ErrorCode } from './errors';
import type { ResolveReviewRequest } from './api';

export type SafeErrorCode =
  | ErrorCode
  | 'FREIGHTER_NOT_INSTALLED'
  | 'FREIGHTER_DENIED'
  | 'FREIGHTER_WRONG_NETWORK'
  | 'FREIGHTER_WRONG_ACCOUNT'
  | 'FREIGHTER_TIMEOUT'
  | 'SIGNATURE_DECLINED';

export interface SafeError {
  code: SafeErrorCode;
  message: string;
  retryAfterMs?: number;
}

export interface UseFreighter {
  status: 'checking' | 'not_installed' | 'not_connected' | 'wrong_network' | 'connected';
  address: GAddress | null;
  connect(): Promise<void>;
  refresh(): Promise<void>;
  error: SafeError | null;
}

export interface UseWalletBinding {
  binding: SessionDTO['binding'];
  freighterMatchesBinding: boolean | null;
  phase: 'idle' | 'requesting_challenge' | 'awaiting_signature' | 'verifying' | 'bound' | 'error';
  bind(): Promise<void>; // challenge (F route) -> Freighter signMessage -> bind (F route)
  error: SafeError | null;
}

export type PaymentScope = { kind: 'plan'; orgId: string; planId: string } | { kind: 'deal'; dealId: string };

export interface UsePayment {
  phase:
    | 'idle'
    | 'preparing'
    | 'review'
    | 'awaiting_signature'
    | 'submitting'
    | 'checking'
    | 'confirmed'
    | 'failed'
    | 'unresolved'
    | 'expired'
    | 'wallet_changed'
    | 'refused_not_approved'
    | 'error';
  review: Omit<PaymentReviewDTO, 'xdr' | 'networkPassphrase'> | null; // what the signing modal shows
  attempt: PaymentAttemptViewDTO | null;
  busy: boolean;
  error: SafeError | null;
  start(): Promise<void>; // POST pay/prepare (403 PLAN_NOT_APPROVED -> 'refused_not_approved')
  signAndSubmit(): Promise<void>; // explicit consent click -> Freighter signTransaction -> POST pay/submit
  checkOriginal(): Promise<void>; // read-only POST pay/check; bounded (<= 6 lookups / 30 s, Retry-After)
  resubmitSameEnvelope(): Promise<void>; // separate explicit button + confirm dialog -> POST pay/resubmit
  stopChecking(): void;
}

export interface UsePlanEvidence {
  plan: BudgetPlanDetailDTO | null;
  loading: boolean;
  refreshing: boolean;
  lastRefreshedAt: IsoUtc | null;
  error: SafeError | null;
  reload(): Promise<void>; // GET plan: pure read
  refreshEvidence(): Promise<void>; // POST evidence/refresh; >= 15 s apart; auto stops at distribution_verified/mismatch
}

export interface UseWalletSummary {
  data: WalletSummaryDTO | null;
  loading: boolean;
  error: SafeError | null;
  reload(): Promise<void>;
}

export interface UseOperatorConsole {
  deployments: DeploymentRegistryEntryDTO[];
  reviews: OperatorReviewDTO[];
  registerDeployment(input: Omit<DeploymentRegistryEntryDTO, 'status' | 'registeredAt'>): Promise<void>;
  resolveReview(id: string, input: ResolveReviewRequest): Promise<void>;
  reload(): Promise<void>;
  error: SafeError | null;
}

export interface ControllerHooks {
  useFreighter(): UseFreighter;
  useWalletBinding(): UseWalletBinding;
  usePayment(scope: PaymentScope): UsePayment;
  usePlanEvidence(orgId: string, planId: string, opts?: { auto?: boolean }): UsePlanEvidence;
  useWalletSummary(): UseWalletSummary;
  useOperatorConsole(): UseOperatorConsole;
}

/** Fixture mode only when NEXT_PUBLIC_CYFER_FIXTURES === '1' AND NODE_ENV !== 'production'. */
export type ControllerMode = 'live' | 'fixture';
