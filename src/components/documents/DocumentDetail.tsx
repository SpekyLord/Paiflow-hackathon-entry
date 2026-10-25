'use client';

import { FileText, Calendar, Download } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDateTime, formatFileSize } from '@/utils/formatters';
import { DOCUMENT_CATEGORIES } from '@/utils/constants';

interface DocumentDetailProps {
  document: {
    id: string;
    title: string;
    category: string;
    description: string;
    file_name: string;
    file_size: number;
    file_url: string;
    file_hash: string;
    status: string;
    created_at: string;
    published_at: string | null;
    users?: { name: string; department: string } | null;
  };
}

export function DocumentDetail({ document }: DocumentDetailProps) {
  const categoryLabel = DOCUMENT_CATEGORIES.find(c => c.value === document.category)?.label ?? document.category;
  const statusVariant = document.status === 'published' ? 'success' : document.status === 'rejected' ? 'error' : 'warning';

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Badge variant={statusVariant}>{document.status.replace('_', ' ')}</Badge>
        <Badge variant="accent">{categoryLabel}</Badge>
      </div>

      <h2 className="text-xl font-bold mb-2">{document.title}</h2>
      <p className="text-sm text-muted mb-4">{document.description}</p>

      <div className="space-y-3 text-sm border-t border-border pt-4">
        <div className="flex items-center gap-2"><FileText size={14} className="text-muted" /><span>{document.file_name}</span></div>
        <div className="flex items-center gap-2"><Calendar size={14} className="text-muted" /><span>{formatDateTime(document.created_at)}</span></div>
        <div><span className="text-muted">Size:</span> {formatFileSize(document.file_size)}</div>
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-muted mb-1">SHA-256 Hash</p>
        <p className="text-xs font-mono break-all text-foreground">{document.file_hash}</p>
      </div>

      {document.file_url && (
        <a href={document.file_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block">
          <Button variant="outline" size="sm"><Download size={14} /> Download</Button>
        </a>
      )}
    </Card>
  );
}
