'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Loader2 } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Badge } from '@/components/ui/Badge';
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { formatDate, formatHash } from '@/utils/formatters';

interface DocumentData {
  id: string;
  title: string;
  category: string;
  status: string;
  file_hash: string;
  created_at: string;
}

const statusVariant: Record<string, 'warning' | 'success' | 'error'> = {
  pending_approval: 'warning',
  published: 'success',
  rejected: 'error',
};

export default function ManageDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchDocuments = useCallback(async () => {
    setLoading(true);

    try {
      const token = localStorage.getItem('cyfer_token');
      const params = new URLSearchParams({ limit: '50' });

      if (statusFilter) {
        params.set('status', statusFilter);
      }

      const res = await fetch(`/api/documents?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();

      if (json.success) {
        setDocuments(json.data.documents ?? []);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return (
    <div>
      <AdminPageHeader
        eyebrow="Document library"
        title="Manage documents"
        description="Review the records currently stored in CYFER, including their publication status and stored fingerprints."
      />

      <div className="card mb-6 p-6">
        <div className="row-between gap-4">
          <div>
            <div className="eyebrow">
              <FileText size={12} />
              Filter records
            </div>
            <p className="mt-2 text-sm text-[var(--text-soft)]">
              Narrow the table by publication status to find drafts, published records, or rejections.
            </p>
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="select min-w-52"
          >
            <option value="">All statuses</option>
            <option value="pending_approval">Pending approval</option>
            <option value="published">Published</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin text-[var(--text-mute)]" />
        </div>
      ) : documents.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="font-serif text-2xl font-semibold text-[var(--ink-900)]">No documents found</div>
          <p className="mt-2 text-sm text-[var(--text-soft)]">
            Try a different status filter or upload a new document to begin.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Hash</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <tbody>
            {documents.map((document) => (
              <TableRow key={document.id}>
                <TableCell>
                  <Link href={`/documents/${document.id}`} className="font-medium text-[var(--ink-700)] hover:underline">
                    {document.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="accent">{document.category}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[document.status] ?? 'default'}>
                    {document.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="mono text-xs">{formatHash(document.file_hash)}</span>
                </TableCell>
                <TableCell>{formatDate(document.created_at)}</TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
