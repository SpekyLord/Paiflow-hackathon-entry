'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  CheckSquare,
  FileText,
  Loader2,
  Wallet,
  XCircle,
} from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDate } from '@/utils/formatters';

interface ApprovalItem {
  id: string;
  status: string;
  documents: {
    id: string;
    title: string;
    category: string;
    description: string;
    file_name: string;
    created_at: string;
    file_url: string;
  } | null;
  budget_data: {
    id: string;
    category: string;
    fiscal_year: number;
    allocated_amount: number;
    description: string;
    created_at: string;
  } | null;
}

export default function ApprovalsPage() {
  const { toast } = useToast();
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchApprovals();
  }, []);

  async function fetchApprovals() {
    setLoading(true);

    try {
      const token = localStorage.getItem('cyfer_token');
      const res = await fetch('/api/consensus?status=pending', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();

      if (json.success) {
        setApprovals(Array.isArray(json.data) ? json.data : []);
      }
    } catch (error) {
      console.error('Failed to fetch approvals:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(entityId: string, action: 'approve' | 'reject') {
    const message = action === 'reject' ? prompt('Reason for rejection (optional):') ?? '' : '';
    setActionLoading(entityId);

    try {
      const token = localStorage.getItem('cyfer_token');
      const res = await fetch(`/api/consensus/${entityId}/${action}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });
      const json = await res.json();

      if (json.success) {
        setApprovals((current) =>
          current.filter((approval) => {
            const id = approval.documents?.id ?? approval.budget_data?.id;
            return id !== entityId;
          }),
        );
        toast(action === 'approve' ? 'success' : 'info', action === 'approve' ? 'Approved successfully!' : 'Rejected.');
      } else {
        toast('error', json.error ?? `Failed to ${action}`);
      }
    } catch (error) {
      console.error(`Failed to ${action}:`, error);
      toast('error', `Network error. Failed to ${action}.`);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div>
      <AdminPageHeader
        eyebrow="Approval workflow"
        title="Pending approvals"
        description="Review documents and budget entries assigned to your account. Publishing continues only after the required consensus is complete."
      />

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin text-[var(--text-mute)]" />
        </div>
      ) : approvals.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-[var(--ok-soft)] text-[var(--ok)]">
            <CheckCircle2 size={30} />
          </div>
          <div className="font-serif text-2xl font-semibold text-[var(--ink-900)]">All caught up</div>
          <p className="mt-2 text-sm text-[var(--text-soft)]">
            No pending approvals are waiting for your review right now.
          </p>
        </div>
      ) : (
        <>
          <div className="row mb-5">
            <Badge variant="warning">{approvals.length}</Badge>
            <span className="text-sm text-[var(--text-soft)]">
              item{approvals.length === 1 ? '' : 's'} awaiting your decision
            </span>
          </div>

          <div className="stack">
            {approvals.map((approval) => {
              const document = approval.documents;
              const budget = approval.budget_data;
              const entityId = document?.id ?? budget?.id;

              if (!entityId) {
                return null;
              }

              const isBudget = Boolean(budget);
              const isActioning = actionLoading === entityId;

              return (
                <div key={approval.id} className="card p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="row">
                        <Badge variant={isBudget ? 'info' : 'accent'}>
                          {isBudget ? 'Budget entry' : document?.category ?? 'Document'}
                        </Badge>
                        <Badge variant="warning">Pending</Badge>
                      </div>

                      <div className="mt-4 row flex-nowrap items-start gap-4">
                        <span className="grid h-11 w-11 flex-none place-items-center rounded-[12px] bg-[var(--ink-050)] text-[var(--ink-700)]">
                          {isBudget ? <Wallet size={20} /> : <FileText size={20} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h2 className="font-serif text-2xl font-semibold text-[var(--ink-900)]">
                            {isBudget
                              ? `${budget?.category} - FY ${budget?.fiscal_year}`
                              : document?.title}
                          </h2>
                          <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
                            {isBudget
                              ? budget?.description || 'No description provided.'
                              : document?.description || 'No description provided.'}
                          </p>
                          <div className="mt-3 row text-xs text-[var(--text-mute)]" style={{ gap: 10 }}>
                            {isBudget ? (
                              <span>{formatCurrency(Number(budget?.allocated_amount ?? 0))}</span>
                            ) : (
                              <span>{document?.file_name}</span>
                            )}
                            <span>
                              {formatDate(isBudget ? budget?.created_at ?? '' : document?.created_at ?? '')}
                            </span>
                          </div>
                          {!isBudget && document?.file_url ? (
                            <a
                              href={document.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 inline-flex text-sm text-[var(--ink-700)] underline-offset-2 hover:underline"
                            >
                              View uploaded file
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="row">
                      <Button
                        size="sm"
                        onClick={() => handleAction(entityId, 'approve')}
                        disabled={isActioning}
                      >
                        {isActioning ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleAction(entityId, 'reject')}
                        disabled={isActioning}
                      >
                        <XCircle size={14} />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card mt-6 p-5" style={{ background: 'var(--warn-soft)', borderColor: 'var(--warn-line)' }}>
            <div className="row flex-nowrap items-start gap-3">
              <CheckSquare size={18} className="mt-0.5 text-[var(--warn)]" />
              <p className="m-0 text-sm leading-6 text-[var(--text-soft)]">
                Documents and budget entries stay in the workflow until the required
                officials approve them. A single rejection interrupts publication and
                preserves the audit trail.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
