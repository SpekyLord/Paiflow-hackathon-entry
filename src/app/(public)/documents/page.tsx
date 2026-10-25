'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { PublicSOP } from '@/components/public/PublicSOP';
import { DocumentCard } from '@/components/documents/DocumentCard';

interface DocumentData {
  id: string;
  title: string;
  category: string;
  description: string;
  file_hash: string;
  status: string;
  created_at: string;
  users?: { name: string; department: string } | null;
}

const categoryFilters = [
  { value: '', label: 'All records' },
  { value: 'ordinance', label: 'New city rules' },
  { value: 'budget', label: 'Budgets' },
  { value: 'resolution', label: 'Official decisions' },
  { value: 'contract', label: 'City agreements' },
  { value: 'permit', label: 'Permits' },
];

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 12;

  const fetchDocuments = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });

      if (search) {
        params.set('search', search);
      }

      if (category) {
        params.set('category', category);
      }

      const res = await fetch(`/api/documents?${params}`);
      const json = await res.json();

      if (json.success) {
        setDocuments(json.data.documents);
        setTotal(json.data.total);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  }, [search, category, page]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const resultLabel = useMemo(
    () => `${total} official record${total === 1 ? '' : 's'}`,
    [total],
  );

  return (
    <main id="main" className="container-page" style={{ paddingBottom: 'var(--s-11)' }}>
      <div className="page-head">
        <div className="eyebrow">
          <span className="eyebrow-dot" />
          Free public access
        </div>
        <h1>Official Records</h1>
        <p className="lead">
          The city&apos;s published documents — searchable and free.
        </p>
      </div>

      <section className="section-tight">
        <PublicSOP
          compact
          title="Finding a document"
          purpose="Find and download the city's published version."
          steps={[
            {
              title: 'Search or filter',
              description: 'By keyword or category.',
            },
            {
              title: 'Open the record',
              description: 'Click to view full details.',
            },
            {
              title: 'Download or compare',
              description: 'Get the official file before relying on any copy.',
            },
          ]}
          next="Download the official file, or use Verify to check your own copy."
        />
      </section>

      <section className="section-tight" style={{ paddingTop: 0 }}>
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-mute)]"
            />
            <input
              className="input"
              style={{ height: 48, paddingLeft: 42, fontSize: 15 }}
              placeholder="Search by title or keyword"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <span className="text-sm text-[var(--text-mute)]">{resultLabel}</span>
        </div>

        <div className="row mt-5" style={{ gap: 8 }}>
          {categoryFilters.map((filter) => {
            const active = category === filter.value;

            return (
              <button
                key={filter.label}
                type="button"
                className={`chip ${active ? 'chip-on' : ''}`}
                onClick={() => {
                  setCategory(filter.value);
                  setPage(1);
                }}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="grid grid-3 mt-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="card p-6">
                <div className="h-6 w-28 rounded-full bg-[var(--ink-050)]" />
                <div className="mt-4 h-6 w-4/5 rounded bg-[var(--ink-050)]" />
                <div className="mt-3 h-4 w-full rounded bg-[var(--ink-025)]" />
                <div className="mt-2 h-4 w-11/12 rounded bg-[var(--ink-025)]" />
                <div className="mt-6 h-10 rounded bg-[var(--ink-025)]" />
              </div>
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="card mt-6 p-10 text-center">
            <div className="font-serif text-2xl font-semibold text-[var(--ink-900)]">
              No official records found
            </div>
            <p className="mt-2 text-sm text-[var(--text-soft)]">
              Try a different keyword or clear filters.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-3 mt-6">
              {documents.map((document) => (
                <DocumentCard key={document.id} document={document} />
              ))}
            </div>

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
    </main>
  );
}
