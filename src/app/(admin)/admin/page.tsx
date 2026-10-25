'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Loader2,
  Upload,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDateTime } from '@/utils/formatters';
import { useLocalStorageJson } from '@/lib/client-storage';

interface AuditEntry {
  id: string;
  action_type: string;
  description: string;
  created_at: string;
}

interface PendingItem {
  id: string;
  status: string;
  documents: {
    id: string;
    title: string;
    category: string;
    created_at: string;
  } | null;
  budget_data: {
    id: string;
    category: string;
    fiscal_year: number;
    created_at: string;
  } | null;
}

interface UserData {
  name: string;
}

export default function AdminDashboardPage() {
  const user = useLocalStorageJson<UserData>('cyfer_user');
  const [stats, setStats] = useState({ pending: 0, total: 0, published: 0 });
  const [recentActivity, setRecentActivity] = useState<AuditEntry[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const token = localStorage.getItem('cyfer_token');
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      try {
        const [docsRes, publishedRes, auditRes, pendingRes] = await Promise.all([
          fetch('/api/documents?limit=1', { headers }),
          fetch('/api/documents?status=published&limit=1', { headers }),
          fetch('/api/audit?limit=6'),
          fetch('/api/consensus?status=pending', { headers }),
        ]);

        const docsJson = await docsRes.json();
        const publishedJson = await publishedRes.json();
        const auditJson = await auditRes.json();
        const pendingJson = await pendingRes.json();

        setStats({
          total: docsJson.data?.total ?? 0,
          published: publishedJson.data?.total ?? 0,
          pending: Array.isArray(pendingJson.data) ? pendingJson.data.length : 0,
        });

        const entries = auditJson.data?.transactions ?? auditJson.data ?? [];
        setRecentActivity(Array.isArray(entries) ? entries : []);
        setPendingItems(Array.isArray(pendingJson.data) ? pendingJson.data.slice(0, 4) : []);
      } catch (error) {
        console.error('Dashboard fetch error:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-[var(--text-mute)]" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          {user?.name ? <div className="eyebrow">{`Welcome back, ${user.name}`}</div> : null}
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-[-0.02em] text-[var(--ink-900)]">
            Dashboard
          </h1>
        </div>
        <div className="row">
          <Link href="/audit">
            <Button variant="outline" size="sm">
              <Activity size={14} />
              Audit trail
            </Button>
          </Link>
          <Link href="/admin/upload">
            <Button size="sm">
              <Upload size={14} />
              Upload document
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-4 mb-4">
        <div className="stat" style={{ padding: 'var(--s-4)' }}>
          <span className="stat-label">Awaiting review</span>
          <span className="stat-value">{stats.pending}</span>
        </div>
        <div className="stat" style={{ padding: 'var(--s-4)' }}>
          <span className="stat-label">Total documents</span>
          <span className="stat-value">{stats.total}</span>
        </div>
        <div className="stat" style={{ padding: 'var(--s-4)' }}>
          <span className="stat-label">Published</span>
          <span className="stat-value">{stats.published}</span>
        </div>
        <div className="stat" style={{ padding: 'var(--s-4)' }}>
          <span className="stat-label">Ledger integrity</span>
          <span className="stat-value" style={{ color: 'var(--ok)' }}>Valid</span>
        </div>
      </div>

      <div className="grid gap-[var(--s-4)] lg:grid-cols-[1.3fr_0.95fr]">
        <div className="card p-0">
          <div className="row-between border-b border-[var(--line)] px-5 py-3">
            <h2 className="font-serif text-lg font-semibold text-[var(--ink-900)]">
              Awaiting your consensus
            </h2>
            <Badge variant="warning">{stats.pending} pending</Badge>
          </div>

          {pendingItems.length === 0 ? (
            <div className="px-5 py-6 text-sm text-[var(--text-soft)]">
              No pending approvals right now.
            </div>
          ) : (
            pendingItems.map((item, index) => {
              const title = item.documents?.title ?? `${item.budget_data?.category} budget entry`;
              const meta = item.documents
                ? `${item.documents.category} · ${formatDateTime(item.documents.created_at)}`
                : `FY ${item.budget_data?.fiscal_year} · ${item.budget_data ? formatDateTime(item.budget_data.created_at) : ''}`;

              return (
                <div
                  key={item.id}
                  className={`row-between px-5 py-3 ${index < pendingItems.length - 1 ? 'border-b border-[var(--line)]' : ''}`}
                >
                  <div>
                    <div className="strong text-sm">{title}</div>
                    <div className="text-xs text-[var(--text-soft)]">{meta}</div>
                  </div>
                  <Link href="/admin/approvals">
                    <Button variant="outline" size="sm">Review</Button>
                  </Link>
                </div>
              );
            })
          )}
        </div>

        <div className="card p-4">
          <div className="eyebrow mb-3">
            <Activity size={12} />
            Recent activity
          </div>
          <div className="stack-2">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-[var(--text-soft)]">No recent activity recorded.</p>
            ) : (
              recentActivity.map((entry) => (
                <div key={entry.id} className="row-between border-b border-dashed border-[var(--line)] py-2 last:border-0">
                  <div className="min-w-0">
                    <Badge
                      variant={
                        entry.action_type === 'approve'
                          ? 'success'
                          : entry.action_type === 'reject'
                            ? 'error'
                            : 'info'
                      }
                    >
                      {entry.action_type}
                    </Badge>
                    <div className="mt-1 text-xs text-[var(--ink-900)] truncate max-w-[220px]">{entry.description}</div>
                  </div>
                  <span className="text-xs text-[var(--text-mute)] shrink-0 ml-2">
                    {formatDateTime(entry.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
