'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Blocks, Loader2, Lock, ScrollText, Shield } from 'lucide-react';
import Link from 'next/link';
import { AuditTimeline } from '@/components/audit/AuditTimeline';
import { ACTION_TYPES } from '@/utils/constants';

interface Transaction {
  id: string;
  action_type: string;
  description: string;
  document_id: string | null;
  performed_by: string;
  tx_hash: string;
  previous_tx_hash: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export default function AuditPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionType, setActionType] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [chainValid, setChainValid] = useState<boolean | null>(null);
  const limit = 20;

  const fetchAudit = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });

      if (actionType) {
        params.set('action_type', actionType);
      }

      const res = await fetch(`/api/audit?${params}`);
      const json = await res.json();

      if (json.success) {
        const entries = json.data.transactions ?? json.data;
        const nextTransactions = Array.isArray(entries) ? entries : [];

        setTransactions(nextTransactions);
        setTotal(json.data.total ?? nextTransactions.length ?? 0);

        if (nextTransactions.length > 1) {
          const sorted = [...nextTransactions].reverse();
          let valid = true;

          for (let index = 1; index < sorted.length; index += 1) {
            if (
              sorted[index].previous_tx_hash &&
              sorted[index].previous_tx_hash !== sorted[index - 1].tx_hash
            ) {
              valid = false;
              break;
            }
          }

          setChainValid(valid);
        } else {
          setChainValid(nextTransactions.length > 0 ? true : null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch audit trail:', error);
    } finally {
      setLoading(false);
    }
  }, [actionType, page]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <main id="main" className="container-page" style={{ paddingBottom: 'var(--s-11)' }}>
      <div className="page-head">
        <div className="eyebrow">
          <span className="eyebrow-dot" />
          Advanced transparency tool
        </div>
        <h1>Public Activity Log</h1>
        <p className="lead">
          Every public action on CYFER, in order.
        </p>
        <div className="page-head-actions">
          <Link
            href="/blockchain"
            className="btn btn-outline inline-flex items-center gap-2"
          >
            <Blocks size={15} />
            View Blockchain Ledger
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      <section className="section-tight">
        <div className="grid grid-3">
          <div className="stat">
            <span className="stat-label">Total entries</span>
            <span className="stat-value">{total}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Chain integrity</span>
            <span className="stat-value" style={{ color: chainValid ? 'var(--ok)' : 'var(--bad)' }}>
              {chainValid === null ? '...' : chainValid ? 'Valid' : 'Broken'}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Latest hash</span>
            <span className="stat-value mono" style={{ fontSize: 15 }}>
              {transactions.length > 0 ? `${transactions[0].tx_hash.slice(0, 10)}...` : '---'}
            </span>
          </div>
        </div>
      </section>

      <section className="section-tight">
        <div className="card p-6">
          <div className="row-between gap-4" style={{ flexWrap: 'wrap' }}>
            <div>
              <div className="eyebrow">
                <ScrollText size={12} />
                Activity filter
              </div>
              <h2 className="mt-2 font-serif text-2xl font-semibold text-[var(--ink-900)]">
                Browse public activity
              </h2>
            </div>
            <div className="row">
              <label className="field-label mb-0">Action type</label>
              <select
                value={actionType}
                onChange={(event) => {
                  setActionType(event.target.value);
                  setPage(1);
                }}
                className="select"
                style={{ minWidth: 200 }}
              >
                <option value="">All actions</option>
                {ACTION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label.trim()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="section-tight">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-[var(--text-mute)]" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="font-serif text-2xl font-semibold text-[var(--ink-900)]">
              No activity found
            </div>
            <p className="mt-2 text-sm text-[var(--text-soft)]">
              Try a different filter, or check back later.
            </p>
          </div>
        ) : (
          <>
            <AuditTimeline transactions={transactions} />

            {totalPages > 1 ? (
              <div className="row mt-8 justify-center">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  className="btn btn-outline btn-sm"
                >
                  Previous
                </button>
                <span className="px-3 text-sm text-[var(--text-mute)]">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page === totalPages}
                  className="btn btn-outline btn-sm"
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>

      <section className="section-tight">
        <div className="grid grid-3">
          {[
            {
              icon: ScrollText,
              title: 'Every action is recorded',
              description:
                'Uploads, approvals, rejections, verifications, publications.',
            },
            {
              icon: Lock,
              title: 'Entries are hash-linked',
              description:
                "Each entry stores the previous hash, so the order can't be changed.",
            },
            {
              icon: Shield,
              title: 'Anyone can inspect the trail',
              description:
                'Open to everyone, no account required.',
            },
          ].map(({ icon: Icon, title, description }) => (
            <div key={title} className="card p-6">
              <span className="mb-4 grid h-11 w-11 place-items-center rounded-[12px] bg-[var(--ink-050)] text-[var(--ink-700)]">
                <Icon size={20} />
              </span>
              <h3 className="font-serif text-xl font-semibold text-[var(--ink-900)]">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
