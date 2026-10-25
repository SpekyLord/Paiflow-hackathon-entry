'use client';

import { DocumentCard } from './DocumentCard';

interface DocumentListProps {
  documents: Array<{
    id: string;
    title: string;
    category: string;
    description: string;
    file_hash: string;
    status: string;
    created_at: string;
    users?: { name: string; department: string } | null;
  }>;
}

export function DocumentList({ documents }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted text-lg">No documents found.</p>
        <p className="text-sm text-muted/60 mt-1">Try adjusting your search or filter criteria.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {documents.map((doc) => (
        <DocumentCard key={doc.id} document={doc} />
      ))}
    </div>
  );
}
