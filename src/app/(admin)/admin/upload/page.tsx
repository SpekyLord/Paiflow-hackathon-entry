'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, FileText, Loader2, Shield, Upload } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { DOCUMENT_CATEGORIES } from '@/utils/constants';

export default function UploadPage() {
  const router = useRouter();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [generatedHash, setGeneratedHash] = useState('');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!file || !title || !category) {
      setError('Please fill in all required fields and choose a file.');
      toast('warning', 'Please fill in all required fields.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('cyfer_token');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('category', category);
      formData.append('description', description);

      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json();

      if (json.success) {
        setGeneratedHash(json.data?.file_hash || '');
        setSuccess(true);
        toast('success', 'Document uploaded and sent for approval.');
        setTimeout(() => router.push('/admin/documents'), 3000);
      } else {
        setError(json.error ?? 'Upload failed');
        toast('error', json.error ?? 'Upload failed');
      }
    } catch {
      setError('Network error. Please try again.');
      toast('error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragActive(false);
    const nextFile = event.dataTransfer.files[0];

    if (nextFile) {
      setFile(nextFile);
    }
  }

  if (success) {
    return (
      <div className="card p-10 text-center">
        <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-[var(--ok-soft)] text-[var(--ok)]">
          <CheckCircle2 size={38} />
        </div>
        <div className="font-serif text-3xl font-semibold text-[var(--ink-900)]">
          Document uploaded successfully
        </div>
        <p className="mt-2 text-sm text-[var(--text-soft)]">
          The record has been queued for approval and its fingerprint has been stored.
        </p>
        {generatedHash ? (
          <div className="mx-auto mt-5 max-w-2xl">
            <div className="eyebrow mb-2 justify-center">
              <Shield size={12} />
              SHA-256 file hash
            </div>
            <div className="hash-block">{generatedHash}</div>
          </div>
        ) : null}
        <p className="mt-4 text-xs text-[var(--text-mute)]">Redirecting to the document library...</p>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        eyebrow="Submission workspace"
        title="Upload document"
        description="Add a new civic record, assign its category, and send it into the approval workflow."
      />

      <div className="grid gap-[var(--s-6)] xl:grid-cols-[1.1fr_0.9fr]">
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="stack-3">
            <Input
              label="Document title"
              placeholder="e.g. Municipal Budget Ordinance 2026"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />

            <div>
              <label className="field-label">Category</label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                required
                className="select"
              >
                <option value="">Select category...</option>
                {DOCUMENT_CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label">Description</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Brief description of the document..."
                className="textarea min-h-28 resize-y"
              />
            </div>

            <div>
              <label className="field-label">File</label>
              <div
                className="dropzone"
                data-drag={dragActive ? 'true' : 'false'}
                data-has-file={file ? 'true' : 'false'}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
              >
                <div className="dropzone-visual">
                  <Upload size={28} />
                </div>
                <div className="dropzone-body">
                  <div className="dropzone-title">
                    {file ? file.name : 'Drop a file here or click to browse'}
                  </div>
                  <div className="dropzone-hint">
                    PDF, DOC, DOCX, XLS, XLSX, TXT, JPG, PNG - Max 50MB
                  </div>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  className="sr-only"
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0];
                    if (nextFile) {
                      setFile(nextFile);
                    }
                  }}
                />
              </div>
              {file ? (
                <div className="row mt-3 text-sm text-[var(--text-soft)]">
                  <FileText size={14} />
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              ) : null}
            </div>

            {error ? (
              <div className="rounded-[var(--r-lg)] border border-[var(--bad-line)] bg-[var(--bad-soft)] px-4 py-3 text-sm text-[var(--bad)]">
                {error}
              </div>
            ) : null}

            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Upload document
                </>
              )}
            </Button>
          </form>
        </div>

        <div className="card p-6">
          <div className="eyebrow">
            <Shield size={12} />
            What happens next
          </div>
          <div className="stack-3 mt-4 text-sm text-[var(--text-soft)]">
            <p className="m-0">
              1. CYFER stores the file and computes its SHA-256 fingerprint.
            </p>
            <p className="m-0">
              2. The record moves into the consensus queue for the assigned officials.
            </p>
            <p className="m-0">
              3. Once approved, the document becomes available in the public portal and verification flow.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
