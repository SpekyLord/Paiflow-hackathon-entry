import Link from 'next/link';
import { ArrowRight, CalendarDays, CheckCircle2, FileText, User } from 'lucide-react';
import { formatDate, formatHash } from '@/utils/formatters';

interface DocumentCardProps {
  document: {
    id: string;
    title: string;
    category: string;
    description: string;
    file_hash: string;
    status: string;
    created_at: string;
    users?: { name: string; department: string } | null;
  };
}

const categoryLabels: Record<string, string> = {
  ordinance: 'New city rule',
  budget: 'Money and spending',
  resolution: 'Official decision',
  contract: 'City agreement',
  permit: 'Permit or license',
  other: 'Official record',
};

export function DocumentCard({ document }: DocumentCardProps) {
  const categoryLabel = categoryLabels[document.category] ?? document.category;

  return (
    <Link
      href={`/documents/${document.id}`}
      className="card card-hover flex h-full flex-col overflow-hidden p-6 no-underline"
    >
      <div className="row">
        <span className="tag">{categoryLabel}</span>
        <span className="tag tag-ok">
          <CheckCircle2 size={12} />
          Officially approved
        </span>
      </div>

      <h3
        className="mt-4 font-serif text-xl font-semibold leading-7 text-[var(--ink-900)]"
        style={{
          overflowWrap: 'break-word',
          wordBreak: 'break-word',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {document.title}
      </h3>
      <p
        className="mt-3 flex-1 text-sm leading-6 text-[var(--text-soft)]"
        style={{
          overflowWrap: 'break-word',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {document.description}
      </p>

      <div className="mt-5 border-t border-[var(--line)] pt-4 text-xs text-[var(--text-mute)]">
        <div className="row" style={{ gap: 10 }}>
          <span className="row" style={{ gap: 5 }}>
            <CalendarDays size={12} />
            Published {formatDate(document.created_at)}
          </span>
          {document.users ? (
            <span className="row" style={{ gap: 5 }}>
              <User size={12} />
              {document.users.name}
            </span>
          ) : null}
        </div>
        <div className="mt-2 row-between gap-3">
          <span className="row min-w-0 flex-nowrap" style={{ gap: 5 }}>
            <FileText size={12} />
            <span className="mono truncate">{formatHash(document.file_hash)}</span>
          </span>
          <span className="row flex-nowrap font-medium text-[var(--ink-700)]" style={{ gap: 4 }}>
            Open record
            <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  );
}
