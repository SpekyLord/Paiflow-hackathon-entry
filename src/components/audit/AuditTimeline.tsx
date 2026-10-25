'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Eye,
  FileText,
  Hash,
  Lock,
  ScrollText,
  Shield,
  Upload,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { formatDateTime } from '@/utils/formatters';

interface Transaction {
  id: string;
  action_type: string;
  description: string;
  document_id: string | null;
  performed_by: string;
  tx_hash: string;
  previous_tx_hash?: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

const actionIcons: Record<string, typeof Upload> = {
  upload: Upload,
  approve: CheckCircle2,
  reject: XCircle,
  publish: Shield,
  verify: FileText,
  access: Eye,
};

const actionBadgeVariant: Record<string, 'info' | 'success' | 'error' | 'warning' | 'default'> = {
  upload: 'info',
  approve: 'success',
  reject: 'error',
  publish: 'success',
  verify: 'warning',
  access: 'default',
};

export function AuditTimeline({ transactions }: { transactions: Transaction[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="chain" style={{ paddingLeft: 'clamp(24px, 6vw, 44px)' }}>
      {transactions.map((transaction, index) => {
        const Icon = actionIcons[transaction.action_type] ?? ScrollText;
        const badgeVariant = actionBadgeVariant[transaction.action_type] ?? 'default';
        const isExpanded = expandedId === transaction.id;

        return (
          <div key={transaction.id} className="chain-node" data-kind={index === 0 ? 'ok' : undefined}>
            <button
              type="button"
              className="btn-row overflow-hidden"
              aria-expanded={isExpanded}
              onClick={() =>
                setExpandedId((current) => (current === transaction.id ? null : transaction.id))
              }
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="grid h-11 w-11 flex-none place-items-center rounded-[var(--r-md)] bg-[var(--ink-025)] text-[var(--ink-700)]">
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap gap-1">
                    <Badge variant={badgeVariant}>{transaction.action_type}</Badge>
                    {index === 0 ? <Badge variant="success">Latest</Badge> : null}
                  </div>
                  <div className="truncate text-sm font-medium text-[var(--ink-900)]">
                    {transaction.description}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-[var(--text-mute)]">
                    <span className="shrink-0">{formatDateTime(transaction.created_at)}</span>
                    <span className="mono shrink-0">{transaction.tx_hash.slice(0, 12)}…</span>
                  </div>
                </div>
              </div>
              <ChevronDown
                size={16}
                className={`ml-2 flex-none text-[var(--text-mute)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              />
            </button>

            {isExpanded ? (
              <div className="card card-flat mt-3 p-4" style={{ background: 'var(--ink-025)' }}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="eyebrow mb-2">
                      <Hash size={12} />
                      Previous transaction hash
                    </div>
                    <div className="hash-block">
                      {transaction.previous_tx_hash ||
                        '0000000000000000000000000000000000000000000000000000000000000000'}
                    </div>
                  </div>
                  <div>
                    <div className="eyebrow mb-2">
                      <Lock size={12} />
                      This transaction hash
                    </div>
                    <div className="hash-block hash-ok">{transaction.tx_hash}</div>
                  </div>
                </div>

                <div className="grid gap-3 pt-4 md:grid-cols-3">
                  <div className="card card-flat p-3">
                    <div className="eyebrow">Action</div>
                    <div className="mt-1 text-sm text-[var(--ink-900)]">{transaction.action_type}</div>
                  </div>
                  <div className="card card-flat p-3">
                    <div className="eyebrow">Performed by</div>
                    <div className="mt-1 mono text-sm text-[var(--ink-900)]">{transaction.performed_by}</div>
                  </div>
                  <div className="card card-flat p-3">
                    <div className="eyebrow">Timestamp</div>
                    <div className="mt-1 text-sm text-[var(--ink-900)]">
                      {formatDateTime(transaction.created_at)}
                    </div>
                  </div>
                </div>

                {transaction.metadata && Object.keys(transaction.metadata).length > 0 ? (
                  <div className="mt-4">
                    <div className="eyebrow mb-2">Metadata</div>
                    <pre className="overflow-x-auto rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--card)] p-4 text-xs leading-6 text-[var(--ink-900)]">
{JSON.stringify(transaction.metadata, null, 2)}
                    </pre>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
