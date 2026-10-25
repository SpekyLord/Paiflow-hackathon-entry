'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  Shield,
  Upload,
  XCircle,
} from 'lucide-react';
import { PublicSOP } from '@/components/public/PublicSOP';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/utils/formatters';

interface VerificationData {
  verified: boolean;
  fileHash: string;
  document?: {
    id: string;
    title: string;
    category: string;
    status: string;
    created_at: string;
    file_hash: string;
    file_url?: string;
  } | null;
  message: string;
}

const faqItems = [
  {
    question: 'What happens when I upload a file?',
    answer:
      'Your file is compared against the matching official record.',
  },
  {
    question: "What if the document doesn't match?",
    answer:
      "Don't trust it yet. Open the official record and compare.",
  },
  {
    question: 'What kinds of files can I check?',
    answer: 'PDF, Word, spreadsheet, text, and common image files are supported.',
  },
  {
    question: 'Why does a tiny change matter?',
    answer:
      'Even a small file change creates a different fingerprint, which helps CYFER detect tampering.',
  },
];

export default function VerifyPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationData | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);
  const [announce, setAnnounce] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleVerify() {
    if (!file) {
      return;
    }

    setLoading(true);
    setResult(null);
    setShowTechnical(false);
    setAnnounce(`Checking ${file.name}`);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/verify', { method: 'POST', body: formData });
      const json = await res.json();

      if (json.success) {
        setResult(json.data);
        setAnnounce(
          json.data.verified
            ? 'Verification complete. This document matches the official record.'
            : 'Verification complete. This document does not match the official record.',
        );
      } else {
        setResult({
          verified: false,
          fileHash: '',
          message: json.error ?? 'Verification failed',
        });
        setAnnounce('Verification failed.');
      }
    } catch {
      setResult({
        verified: false,
        fileHash: '',
        message: 'Network error. Please try again.',
      });
      setAnnounce('Verification failed because of a network error.');
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragActive(false);
    const droppedFile = event.dataTransfer.files[0];

    if (droppedFile) {
      setFile(droppedFile);
      setResult(null);
      setShowTechnical(false);
    }
  }

  function handleReset() {
    setFile(null);
    setResult(null);
    setShowTechnical(false);
    setAnnounce('');

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  return (
    <main id="main" className="container-read" style={{ paddingBottom: 'var(--s-11)' }}>
      <div className="page-head">
        <div className="eyebrow">
          <span className="eyebrow-dot" />
          Free · No account needed
        </div>
        <h1>Is this document real?</h1>
        <p className="lead">
          Upload a file. We&apos;ll tell you if it matches the official record.
        </p>
      </div>

      <section className="section-tight">
        <PublicSOP
          compact
          title="How it works"
          purpose="Confirm whether a document you received is the real one."
          steps={[
            {
              title: 'Upload the file you received',
              description: 'From your phone or computer.',
            },
            {
              title: 'Wait for the result',
              description: 'We compare it against the official record.',
            },
            {
              title: 'Open the official copy if needed',
              description: "If it doesn't match, open the official copy.",
            },
          ]}
          next="No match? Open Official Records before trusting the file."
        />
      </section>

      <section className="section" aria-labelledby="verification-upload">
        <div
          className="dropzone"
          role="button"
          tabIndex={0}
          aria-labelledby="verification-upload"
          aria-describedby="verification-hint"
          data-drag={dragActive ? 'true' : 'false'}
          data-has-file={file ? 'true' : 'false'}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <div className="dropzone-visual">
            <Upload size={28} />
          </div>
          <div className="dropzone-body">
            <div id="verification-upload" className="dropzone-title">
              {file ? file.name : 'Drop your document here'}
            </div>
            <div id="verification-hint" className="dropzone-hint">
              {file
                ? `${(file.size / 1024).toFixed(1)} KB - Ready to verify`
                : 'PDF, Word, Excel, text, or image. Click or drag in.'}
            </div>
          </div>
          {file ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                handleReset();
              }}
            >
              Pick another file
            </Button>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
            onChange={(event) => {
              const nextFile = event.target.files?.[0];

              if (nextFile) {
                setFile(nextFile);
                setResult(null);
                setShowTechnical(false);
              }
            }}
          />
        </div>

        <div className="row mt-4">
          <Button onClick={handleVerify} disabled={!file || loading}>
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Shield size={16} />
                Verify this document
              </>
            )}
          </Button>
          {file ? (
            <Button variant="outline" onClick={handleReset} disabled={loading}>
              Reset
            </Button>
          ) : null}
        </div>

        {result ? (
          <section
            className={`verdict mt-6 ${result.verified ? 'verdict-ok' : 'verdict-bad'}`}
            aria-live="polite"
          >
            <div className="verdict-head">
              <div className="verdict-icon">
                {result.verified ? <CheckCircle2 size={36} /> : <XCircle size={36} />}
              </div>
              <div className="verdict-meta">
                <div className="eyebrow" style={{ marginBottom: 8 }}>
                  <span
                    className="eyebrow-dot"
                    style={{
                      background: result.verified ? 'var(--ok)' : 'var(--bad)',
                    }}
                  />
                  {result.verified ? 'Match found' : 'No match found'}
                </div>
                <h2 className="verdict-display">
                  {result.verified ? "It's real." : "Something's off."}
                </h2>
                <p className="verdict-sub">{result.message}</p>
              </div>
            </div>

            <div className="verdict-body">
              {result.verified && result.document ? (
                <div className="card card-flat p-5">
                  <div className="stack-3">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span className="soft" style={{ fontSize: 13 }}>
                        What this is
                      </span>
                      <strong style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                        {result.document.title}
                      </strong>
                    </div>
                    <div className="row-between">
                      <span className="soft">Type</span>
                      <Badge variant="accent">{result.document.category}</Badge>
                    </div>
                    <div className="row-between">
                      <span className="soft">Published</span>
                      <span>{formatDate(result.document.created_at)}</span>
                    </div>
                    <div className="row-between">
                      <span className="soft">Status</span>
                      <Badge variant="success">{result.document.status}</Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card card-flat border-[var(--bad-line)] p-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={22} className="mt-0.5 text-[var(--bad)]" />
                    <div>
                      <div className="strong">What could be going on</div>
                      <ul className="mt-2 space-y-2 pl-5 text-sm leading-6 text-[var(--text-soft)]">
                        <li>The file may have been edited after it was published.</li>
                        <li>It may be an unofficial or outdated copy.</li>
                        <li>It could belong to a different office or city.</li>
                      </ul>
                      <p className="mt-3 text-sm text-[var(--text-soft)]">
                        Open the official record before you rely on the document.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {result.fileHash ? (
                <div className="border-t border-[var(--line)] pt-4">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowTechnical((value) => !value)}
                  >
                    {showTechnical ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {showTechnical ? 'Hide technical details' : 'Show technical details'}
                  </button>

                  {showTechnical ? (
                    <div className="stack-3 mt-3">
                      <p className="m-0 text-sm leading-6 text-[var(--text-soft)]">
                        The fingerprints used for the comparison.
                      </p>
                      <div className={`hash-block ${result.verified ? 'hash-ok' : 'hash-bad'}`}>
                        <span className="mb-1 block text-[11px] uppercase tracking-[0.12em] text-[var(--text-mute)]">
                          Uploaded file
                        </span>
                        {result.fileHash}
                      </div>
                      {result.verified && result.document ? (
                        <div className="hash-block">
                          <span className="mb-1 block text-[11px] uppercase tracking-[0.12em] text-[var(--text-mute)]">
                            Official record
                          </span>
                          {result.document.file_hash}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="row">
                {result.verified && result.document ? (
                  result.document.file_url ? (
                    <a
                      href={result.document.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button>
                        <FileText size={15} />
                        View official record
                      </Button>
                    </a>
                  ) : (
                    <Link href={`/documents/${result.document.id}`}>
                      <Button>
                        <FileText size={15} />
                        View official record
                      </Button>
                    </Link>
                  )
                ) : (
                  <Link href="/documents">
                    <Button variant="outline">
                      <FileText size={15} />
                      Open official records
                    </Button>
                  </Link>
                )}
                <Button variant="outline" onClick={handleReset}>
                  Check another file
                </Button>
              </div>
            </div>
          </section>
        ) : null}

        <div className="card mt-6 p-5" style={{ background: 'var(--ink-025)' }}>
          <div className="row-between gap-4">
            <div>
              <div className="eyebrow">Need public proof?</div>
              <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
                If you want more than a yes-or-no result, open the public activity history
                or the technical ledger view.
              </p>
            </div>
            <div className="row">
              <Link href="/audit">
                <Button variant="outline" size="sm">Activity Log</Button>
              </Link>
              <Link href="/blockchain">
                <Button variant="ghost" size="sm">Blockchain</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Common questions</h2>
        </div>
        <div className="stack-3">
          {faqItems.map((item) => (
            <details key={item.question} className="faq">
              <summary>
                <span>{item.question}</span>
                <ChevronDown size={16} />
              </summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="sr-only" aria-live="polite">
        {announce}
      </div>
    </main>
  );
}
