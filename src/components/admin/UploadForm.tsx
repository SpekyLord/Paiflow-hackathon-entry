'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DOCUMENT_CATEGORIES } from '@/utils/constants';

export function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title || !category) {
      setError('Please fill in all required fields and select a file.');
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
        setSuccess(true);
        setTimeout(() => router.push('/admin/documents'), 2000);
      } else {
        setError(json.error ?? 'Upload failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }

  if (success) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-success" />
        </div>
        <h2 className="text-xl font-bold mb-2">Document Uploaded Successfully</h2>
        <p className="text-muted">The document has been sent for approval by all officials.</p>
      </div>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Document Title *"
          placeholder="e.g. Municipal Budget Ordinance 2026"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Category *</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 cursor-pointer"
          >
            <option value="">Select category...</option>
            {DOCUMENT_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the document..."
            className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 min-h-[80px] resize-y"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">File *</label>
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
              ${dragActive ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'}`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={32} className="mx-auto mb-2 text-muted" />
            <p className="text-sm font-medium">{file ? file.name : 'Drop a file here or click to browse'}</p>
            <p className="text-xs text-muted mt-1">PDF, DOC, DOCX, XLS, XLSX, TXT, JPG, PNG — Max 50MB</p>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }}
            />
          </div>
          {file && (
            <div className="flex items-center gap-2 mt-2 text-sm text-muted">
              <FileText size={14} />
              <span>{file.name}</span>
              <span>({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
          )}
        </div>
        {error && (
          <div className="p-3 bg-red-50 border border-error/20 rounded-lg text-sm text-error">{error}</div>
        )}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Uploading &amp; Hashing...</>
          ) : (
            <><Upload size={16} /> Upload Document</>
          )}
        </Button>
      </form>
    </Card>
  );
}
