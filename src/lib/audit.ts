// Audit trail logging helper — used across all API endpoints
// Records every state-changing action as a transaction entry

import { createServerClient } from './supabase';
import { hashString } from './hash';
import type { ActionType, Transaction } from './types';

interface LogActionParams {
  actionType: ActionType;
  description: string;
  documentId?: string;
  performedBy: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an action to the audit trail (transactions table).
 * Each transaction is hash-linked to the previous one for chain integrity.
 */
export async function logAuditAction(params: LogActionParams): Promise<Transaction> {
  const supabase = createServerClient();

  // Fetch the latest transaction to link to it
  const { data: latestTx } = await supabase
    .from('transactions')
    .select('tx_hash')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const previousTxHash = latestTx?.tx_hash ?? '0';

  // Compute transaction hash
  const txInput = `${params.actionType}${params.description}${params.documentId ?? ''}${params.performedBy}${previousTxHash}${Date.now()}`;
  const txHash = await hashString(txInput);

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      action_type: params.actionType,
      description: params.description,
      document_id: params.documentId ?? null,
      performed_by: params.performedBy,
      tx_hash: txHash,
      previous_tx_hash: previousTxHash,
      metadata: params.metadata ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to log audit action:', error);
    throw new Error(`Failed to log audit action: ${error.message}`);
  }

  return data as Transaction;
}
