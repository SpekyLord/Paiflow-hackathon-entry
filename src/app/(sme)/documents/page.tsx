'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import type { OrgDocumentDTO, OrgDocumentKind, VerifyFileResultDTO } from '@/contracts/dto';
import { MAX_UPLOAD_BYTES } from '@/contracts/limits';
import { TAMPER_CHECK_COPY } from '@/contracts/state-copy';
import { ApiClientError } from '@/client/http';
import * as data from '@/components/sme/data';
import { useSession } from '@/components/sme/session';
import {
  ErrorNotice, HashChip, Loading, PageHeader, btnOutline, btnPrimary, card, formatPht, inputCls, labelCls,
} from '@/components/sme/evidence';

// S-18. The tamper check never says "tampered": a mismatch only means the bytes differ from the record.
const KINDS: { value: OrgDocumentKind; label: string }[] = [
  { value: 'contract', label: 'Contract' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'plan_attachment', label: 'Plan attachment' },
  { value: 'other', label: 'Other' },
];
const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.value, k.label])) as Record<OrgDocumentKind, string>;

const FILE_ERRORS: Record<string, string> = {
  REQUEST_TOO_LARGE: 'That file is larger than 10 MB. Choose a smaller file.',
  UNSUPPORTED_MEDIA_TYPE: 'That file type is not supported. Use PDF, PNG, JPEG, ZIP, TXT or DOCX.',
  FORBIDDEN: 'You are not allowed to do this.',
  NOT_MEMBER: 'You are not a member of this organisation.',
};
const errText = (e: unknown, fallback: string) =>
  e instanceof ApiClientError ? FILE_ERRORS[e.safe.code] ?? e.safe.message : fallback;

interface Target { key: string; kind: 'org_document' | 'plan_version'; id: string; label: string }

export default function DocumentsPage() {
  const { org } = useSession();
  const orgId = org?.orgId;
  const [docs, setDocs] = useState<OrgDocumentDTO[] | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [listError, setListError] = useState<string | null>(null);

  const [kind, setKind] = useState<OrgDocumentKind>('contract');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [targetKey, setTargetKey] = useState('');
  const [candidate, setCandidate] = useState<File | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyFileResultDTO | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId) return;
    try {
      const list = await data.listDocuments(orgId);
      setDocs(list);
      const docTargets: Target[] = list.map((d) => ({ key: `d:${d.documentId}`, kind: 'org_document', id: d.documentId, label: `Document: ${d.originalFilename}` }));
      let planTargets: Target[] = [];
      try {
        const plans = await data.listPlans(orgId);
        const details = await Promise.all(plans.slice(0, 10).map((p) => data.getPlan(orgId, p.planId)));
        planTargets = details.flatMap((p) => p.versions.map((v) => ({
          key: `p:${v.versionId}`, kind: 'plan_version' as const, id: v.versionId, label: `Plan: ${p.purpose} · version ${v.version}`,
        })));
      } catch { /* plan versions are optional for the tamper check */ }
      setTargets([...docTargets, ...planTargets]);
      setListError(null);
    } catch (e) {
      setListError(errText(e, 'Could not load documents.'));
    }
  }, [orgId]);
  useEffect(() => { void load(); }, [load]);

  const tooBig = (f: File | null) => f !== null && f.size > MAX_UPLOAD_BYTES;

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!orgId || !file) return;
    if (tooBig(file)) { setUploadError(FILE_ERRORS.REQUEST_TOO_LARGE); return; }
    setUploading(true);
    setUploadError(null);
    try {
      await data.uploadDocument(orgId, kind, file);
      setFile(null);
      (document.getElementById('upload-file') as HTMLInputElement | null)?.form?.reset();
      await load();
    } catch (e) {
      setUploadError(errText(e, 'Could not upload the file.'));
    } finally {
      setUploading(false);
    }
  }

  async function download(docId: string) {
    if (!orgId) return;
    setDownloadError(null);
    try {
      const { url } = await data.downloadDocumentUrl(orgId, docId);
      if (url !== '#fixture') window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setDownloadError(errText(e, 'Could not create a download link.'));
    }
  }

  async function check(event: React.FormEvent) {
    event.preventDefault();
    const target = targets.find((t) => t.key === targetKey);
    if (!orgId || !target || !candidate) return;
    setChecking(true);
    setCheckError(null);
    setResult(null);
    try {
      setResult(await data.verifyFile(orgId, { kind: target.kind, id: target.id }, candidate));
    } catch (e) {
      setCheckError(errText(e, 'Could not check the file.'));
    } finally {
      setChecking(false);
    }
  }

  if (!org) return <p className="text-sm">Your account is not a member of an organisation yet.</p>;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Documents" title="Documents and tamper check" />
      <p className="max-w-[640px] text-sm leading-6 text-[#5f7167]">Each uploaded file is recorded with its SHA-256 fingerprint. The hash proves a file is byte-identical to the record, not that the work is good.</p>

      <section className={`${card} p-5`} aria-labelledby="up-heading">
        <h2 id="up-heading" className="text-sm font-semibold text-[#214638]">Upload a document</h2>
        <p className="mt-1 text-xs text-[#52625a]">Up to 10 MB. PDF, PNG, JPEG, ZIP, TXT or DOCX.</p>
        <form onSubmit={upload} className="mt-4 grid gap-4 sm:grid-cols-[200px_1fr_auto] sm:items-end">
          <div>
            <label htmlFor="doc-kind" className={labelCls}>Document type</label>
            <select id="doc-kind" value={kind} onChange={(e) => setKind(e.target.value as OrgDocumentKind)} className={`${inputCls} mt-2`}>
              {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="upload-file" className={labelCls}>File</label>
            <input id="upload-file" type="file" required accept=".pdf,.png,.jpg,.jpeg,.zip,.txt,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-2 block w-full text-sm" />
          </div>
          <button type="submit" disabled={uploading || !file} className={btnPrimary}>{uploading ? 'Uploading…' : 'Upload and record'}</button>
        </form>
        <div className="mt-3" aria-live="polite">{uploadError && <ErrorNotice message={uploadError} />}</div>
      </section>

      <section className={`${card} overflow-hidden`} aria-labelledby="list-heading">
        <h2 id="list-heading" className="border-b border-[#edf0ec] px-5 py-4 text-sm font-semibold text-[#214638]">Recorded documents</h2>
        {listError && <div className="p-5"><ErrorNotice message={listError} /></div>}
        {!listError && docs === null && <Loading label="Loading documents…" />}
        {docs?.length === 0 && <p className="px-5 py-8 text-center text-sm text-[#5f7167]">No documents recorded yet.</p>}
        {docs && docs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <caption className="sr-only">Recorded documents with SHA-256</caption>
              <thead className="bg-[#f8faf7] text-[10px] uppercase tracking-[0.13em] text-[#6d7f75]">
                <tr><th scope="col" className="px-5 py-2.5">File</th><th scope="col" className="px-3">SHA-256</th><th scope="col" className="px-3">Recorded</th><th scope="col" className="px-3"><span className="sr-only">Download</span></th></tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.documentId} className="border-t border-[#edf0ec] align-top">
                    <td className="px-5 py-3"><div className="font-semibold text-[#25483a]">{d.originalFilename}</div><div className="text-xs text-[#52625a]">{KIND_LABEL[d.kind]} · {(d.sizeBytes / 1024).toFixed(1)} KB</div></td>
                    <td className="px-3 py-3"><HashChip value={d.sha256} kind="sha256" /></td>
                    <td className="px-3 py-3 text-xs text-[#52625a]">{formatPht(d.uploadedAt)}<div>by {d.uploadedBy}</div></td>
                    <td className="px-3 py-3"><button type="button" className={btnOutline} onClick={() => void download(d.documentId)} aria-label={`Download ${d.originalFilename}`}><Download size={14} aria-hidden /> Download</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {downloadError && <div className="p-5 pt-0"><ErrorNotice message={downloadError} /></div>}
      </section>

      <section className={`${card} p-5`} aria-labelledby="chk-heading">
        <h2 id="chk-heading" className="text-sm font-semibold text-[#214638]">Verify a file</h2>
        <p className="mt-1 text-xs text-[#52625a]">Pick a recorded document or plan version, then choose the file you want to compare. The file is hashed and compared; it is not stored.</p>
        <form onSubmit={check} className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <label htmlFor="chk-target" className={labelCls}>Recorded item</label>
            <select id="chk-target" required value={targetKey} onChange={(e) => setTargetKey(e.target.value)} className={`${inputCls} mt-2`}>
              <option value="">Choose…</option>
              {targets.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="chk-file" className={labelCls}>File to compare</label>
            <input id="chk-file" type="file" required onChange={(e) => { setCandidate(e.target.files?.[0] ?? null); setResult(null); }} className="mt-2 block w-full text-sm" />
          </div>
          <button type="submit" disabled={checking || !candidate || !targetKey} className={btnPrimary}>{checking ? 'Checking…' : 'Check file'}</button>
        </form>

        <div className="mt-4" aria-live="polite">
          {checkError && <ErrorNotice message={checkError} />}
          {result && (
            <div className={`rounded-lg border px-4 py-3 text-sm ${result.match ? 'border-[#b9d3c4] bg-[#eaf4ee] text-[#1d4e36]' : 'border-[#e8cf9a] bg-[#fff8e6] text-[#6b4a0a]'}`}>
              <p className="font-semibold">{result.match ? 'Match' : 'No match'}</p>
              <p className="mt-1">{result.match
                ? TAMPER_CHECK_COPY.match(result.target.label, formatPht(result.recordedAt))
                : TAMPER_CHECK_COPY.noMatch(result.target.label)}</p>
              <div className="mt-2 space-y-1">
                <div><HashChip value={result.recordedSha256} kind="sha256" /> <span className="text-[11px]">(recorded)</span></div>
                <div><HashChip value={result.candidateSha256} kind="sha256" /> <span className="text-[11px]">(your file)</span></div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
