'use client';

import { CheckCircle, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatHash, formatDate } from '@/utils/formatters';

interface VerificationResultProps {
  result: {
    verified: boolean;
    fileHash: string;
    document?: {
      id: string;
      title: string;
      category: string;
      created_at: string;
      file_hash: string;
    } | null;
    message: string;
  };
}

export function VerificationResult({ result }: VerificationResultProps) {
  return (
    <Card className={`border-2 ${result.verified ? 'border-success bg-green-50' : 'border-error bg-red-50'}`}>
      <div className="flex items-center gap-3 mb-4">
        {result.verified ? (
          <div className="w-12 h-12 bg-success/20 rounded-full flex items-center justify-center">
            <CheckCircle size={28} className="text-success" />
          </div>
        ) : (
          <div className="w-12 h-12 bg-error/20 rounded-full flex items-center justify-center">
            <XCircle size={28} className="text-error" />
          </div>
        )}
        <div>
          <h2 className="text-lg font-bold">{result.verified ? 'Document Verified' : 'Verification Failed'}</h2>
          <p className="text-sm text-muted">{result.message}</p>
        </div>
      </div>

      {result.fileHash && (
        <div className="p-3 bg-white/80 rounded-lg mb-3">
          <p className="text-xs text-muted mb-1">File SHA-256 Hash</p>
          <p className="text-xs font-mono break-all">{result.fileHash}</p>
        </div>
      )}

      {result.verified && result.document && (
        <div className="p-3 bg-white/80 rounded-lg space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Document</span>
            <span className="font-medium">{result.document.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Category</span>
            <Badge variant="accent">{result.document.category}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Published</span>
            <span>{formatDate(result.document.created_at)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Stored Hash</span>
            <span className="font-mono text-xs">{formatHash(result.document.file_hash)}</span>
          </div>
        </div>
      )}
    </Card>
  );
}
