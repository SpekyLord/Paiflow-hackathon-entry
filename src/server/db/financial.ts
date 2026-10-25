import 'server-only';
import { getServiceClient } from './client';
import { createFinancialDb, type FinancialDb } from './financial-core';

export * from './financial-core';

// Lazy: the client is created on first use so importing this module never throws at build time.
let db: FinancialDb | null = null;
const get = (): FinancialDb => (db ??= createFinancialDb(getServiceClient()));

export const getPaymentContext: FinancialDb['getPaymentContext'] = (...a) => get().getPaymentContext(...a);
export const getOpenAttempt: FinancialDb['getOpenAttempt'] = (...a) => get().getOpenAttempt(...a);
export const getAttempt: FinancialDb['getAttempt'] = (...a) => get().getAttempt(...a);
export const getLatestAttempt: FinancialDb['getLatestAttempt'] = (...a) => get().getLatestAttempt(...a);
export const listScopesNeedingReconciliation: FinancialDb['listScopesNeedingReconciliation'] = (...a) => get().listScopesNeedingReconciliation(...a);
export const beginPaymentAttempt: FinancialDb['beginPaymentAttempt'] = (...a) => get().beginPaymentAttempt(...a);
export const recordPreparation: FinancialDb['recordPreparation'] = (...a) => get().recordPreparation(...a);
export const failPreparation: FinancialDb['failPreparation'] = (...a) => get().failPreparation(...a);
export const markSignatureRequested: FinancialDb['markSignatureRequested'] = (...a) => get().markSignatureRequested(...a);
export const persistSignedEnvelope: FinancialDb['persistSignedEnvelope'] = (...a) => get().persistSignedEnvelope(...a);
export const recordEnvelopeRejection: FinancialDb['recordEnvelopeRejection'] = (...a) => get().recordEnvelopeRejection(...a);
export const recordSubmission: FinancialDb['recordSubmission'] = (...a) => get().recordSubmission(...a);
export const recordStatusCheck: FinancialDb['recordStatusCheck'] = (...a) => get().recordStatusCheck(...a);
export const markExpiredUnsigned: FinancialDb['markExpiredUnsigned'] = (...a) => get().markExpiredUnsigned(...a);
export const recordPaymentReceiptVerification: FinancialDb['recordPaymentReceiptVerification'] = (...a) => get().recordPaymentReceiptVerification(...a);
export const recordEnvelopePayoutVerification: FinancialDb['recordEnvelopePayoutVerification'] = (...a) => get().recordEnvelopePayoutVerification(...a);
export const upsertPaiflowEvents: FinancialDb['upsertPaiflowEvents'] = (...a) => get().upsertPaiflowEvents(...a);
export const getEventCursor: FinancialDb['getEventCursor'] = (...a) => get().getEventCursor(...a);
export const advanceEventCursor: FinancialDb['advanceEventCursor'] = (...a) => get().advanceEventCursor(...a);
export const listStoredEvents: FinancialDb['listStoredEvents'] = (...a) => get().listStoredEvents(...a);
export const acquireReconcileLease: FinancialDb['acquireReconcileLease'] = (...a) => get().acquireReconcileLease(...a);
export const releaseReconcileLease: FinancialDb['releaseReconcileLease'] = (...a) => get().releaseReconcileLease(...a);
export const consumeReconcileBudget: FinancialDb['consumeReconcileBudget'] = (...a) => get().consumeReconcileBudget(...a);
export const registerDeployment: FinancialDb['registerDeployment'] = (...a) => get().registerDeployment(...a);
export const setDeploymentStatus: FinancialDb['setDeploymentStatus'] = (...a) => get().setDeploymentStatus(...a);
export const listDeployments: FinancialDb['listDeployments'] = (...a) => get().listDeployments(...a);
export const openOperatorReview: FinancialDb['openOperatorReview'] = (...a) => get().openOperatorReview(...a);
export const listOperatorReviews: FinancialDb['listOperatorReviews'] = (...a) => get().listOperatorReviews(...a);
export const resolveOperatorReview: FinancialDb['resolveOperatorReview'] = (...a) => get().resolveOperatorReview(...a);
export const getWalletContext: FinancialDb['getWalletContext'] = (...a) => get().getWalletContext(...a);
