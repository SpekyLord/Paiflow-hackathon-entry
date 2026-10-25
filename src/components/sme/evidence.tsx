'use client';

// S-21 evidence display components. Used on every SME screen so wording stays consistent.
// Hash kinds are never mixed: Stellar tx (explorer-checkable), SHA-256 (files, plans), CYFER audit hash (not Stellar).

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Copy, ExternalLink, Check, ShieldAlert, FlaskConical } from 'lucide-react';
import type { VerificationState } from '@/contracts/states';
import { EXPLORER_LABEL, HASH_LABELS } from '@/contracts/state-copy';
import { stellarExpertTxUrl } from '@/lib/explorer';
import { fromStroops } from '@/lib/amount';
import { getControllerMode } from '@/client/controllers';

export const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#26715b]';
export const card = 'rounded-xl border border-[#e2e9e2] bg-white shadow-[0_1px_2px_rgba(25,56,43,0.03)]';
export const btnPrimary = `inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#174b3d] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#23624f] disabled:cursor-not-allowed disabled:bg-[#b9c6bf] ${focusRing}`;
// Dashboard (bento) surfaces used by the overview-style screens.
export const panel = 'rounded-[28px] bg-white';
export const panelLime = 'rounded-[28px] bg-[#b5ee71] text-[#0f3a1c]';
export const btnPill = `inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#134223] px-5 text-[13px] font-medium text-white transition-colors hover:bg-[#1b5a31] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
export const btnPillOutline = `inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#134223] bg-white px-5 text-[13px] font-medium text-[#134223] transition-colors hover:bg-[#f1f6ec] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
export const btnOutline =`inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#cdd8cf] bg-white px-4 text-[13px] font-semibold text-[#2c4f40] transition-colors hover:bg-[#f4f7f3] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
export const btnDanger = `inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#d9a79f] bg-white px-4 text-[13px] font-semibold text-[#8f3326] transition-colors hover:bg-[#fcefec] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
export const inputCls = `h-11 w-full rounded-lg border border-[#dfe7df] bg-[#fcfdfb] px-3.5 text-sm text-[#25483a] placeholder:text-[#a0aaa3] focus:border-[#6d9a7b] focus:outline-none focus:ring-2 focus:ring-[#d9eadc]`;
export const labelCls = 'block text-xs font-semibold text-[#365548]';

export function FixtureBanner() {
  if (getControllerMode() !== 'fixture') return null;
  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-[#7a4b00] px-4 py-2 text-center text-xs font-semibold text-white">
      <FlaskConical size={14} aria-hidden /> FIXTURE DATA — not Testnet
    </div>
  );
}

export function TestnetChip() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#b9d3c4] bg-[#eaf4ee] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#1f5a43]">
      <span className="size-1.5 rounded-full bg-[#2b8a63]" aria-hidden /> Testnet
    </span>
  );
}

export function TestnetNote() {
  return (
    <p className="text-[11px] leading-5 text-[#6d7f75]">
      Testnet — simulation, no real money. A verified payout proves distribution, not that the money was well spent.
    </p>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow && <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#5f7167]">{eyebrow}</div>}
        <h1 className="font-serif text-[32px] font-semibold leading-tight tracking-[-0.04em] text-[#173b30] md:text-[40px]">{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function ErrorNotice({ message, code }: { message: string; code?: string }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-[#e4b8b0] bg-[#fdf2ef] px-3.5 py-3 text-xs leading-5 text-[#7e2f23]">
      <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />
      <span>{message}{code && <span className="ml-1 font-mono text-[10px] opacity-70">({code})</span>}</span>
    </div>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return <div role="status" aria-live="polite" className="py-10 text-center text-sm text-[#6d7f75]">{label}</div>;
}

// ---------- amounts ----------
export function Xlm({ stroops }: { stroops: string }) {
  let text = '—';
  try { text = fromStroops(stroops); } catch { /* keep placeholder */ }
  return <span className="font-mono tabular-nums">{text} <span className="text-[#6d7f75]">XLM</span></span>;
}

/** PHP planning figure: integer centavos in, pesos out, never converted from or to XLM. */
export function PhpPlanning({ centavos }: { centavos: string | null }) {
  if (!centavos) return <span className="text-[#8a9890]">—</span>;
  const n = BigInt(centavos);
  const pesos = `${n / BigInt(100)}.${(n % BigInt(100)).toString().padStart(2, '0')}`;
  return (
    <span>
      <span className="font-mono tabular-nums">PHP {Number(pesos).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
      <span className="block text-[10px] text-[#6d7f75]">planning figure (PHP), not a crypto amount</span>
    </span>
  );
}

// ---------- hash ----------
export type HashKind = keyof typeof HASH_LABELS;

export function abbreviate(value: string, head = 8, tail = 6) {
  return value.length <= head + tail + 1 ? value : `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function HashChip({ value, kind, explorer = false }: { value: string; kind: HashKind; explorer?: boolean }) {
  const [copied, setCopied] = useState(false);
  const label = kind === 'auditHash' ? 'CYFAI audit hash (not a Stellar transaction)' : HASH_LABELS[kind];
  let href: string | null = null;
  if (explorer && kind === 'stellarTxHash') {
    try { href = stellarExpertTxUrl(value); } catch { href = null; }
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  };
  return (
    <span className="inline-flex max-w-full flex-wrap items-center gap-1.5 text-xs">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#6d7f75]">{label}</span>
      <span className="font-mono text-[#25483a]" title={value}>
        <span aria-hidden>{abbreviate(value)}</span>
        <span className="sr-only">{value}</span>
      </span>
      <button type="button" onClick={copy} aria-label={`Copy ${label}`} className={`rounded p-1 text-[#5f7167] hover:bg-[#eef3ee] ${focusRing}`}>
        {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
      </button>
      <span role="status" aria-live="polite" className="sr-only">{copied ? 'Copied' : ''}</span>
      {href && (
        <a href={href} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 rounded text-[#1f5a43] underline underline-offset-2 ${focusRing}`}>
          {EXPLORER_LABEL} <ExternalLink size={11} aria-hidden />
        </a>
      )}
    </span>
  );
}

// ---------- verification badge ----------
const BADGE: Record<VerificationState, { text: string; tone: string; Icon: typeof Clock }> = {
  not_started: { text: 'Pending evidence', tone: 'bg-[#f0f2ef] text-[#52625a]', Icon: Clock },
  awaiting_tx_final: { text: 'Pending evidence', tone: 'bg-[#f0f2ef] text-[#52625a]', Icon: Clock },
  awaiting_events: { text: 'Pending evidence', tone: 'bg-[#e9eff8] text-[#35557d]', Icon: Clock },
  verified: { text: 'Verified', tone: 'bg-[#e1f1e6] text-[#1d5e3b]', Icon: CheckCircle2 },
  mismatch: { text: 'Mismatch — under review', tone: 'bg-[#fce9e6] text-[#8f3326]', Icon: ShieldAlert },
  operator_review: { text: 'Needs review', tone: 'bg-[#f2ecfa] text-[#5c3f84]', Icon: ShieldAlert },
};

export function VerificationBadge({ state }: { state: VerificationState }) {
  const { text, tone, Icon } = BADGE[state];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>
      <Icon size={12} aria-hidden /> {text}
    </span>
  );
}

export function formatPht(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })} PHT`;
}
