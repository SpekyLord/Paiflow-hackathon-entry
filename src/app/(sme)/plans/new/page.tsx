'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Info } from 'lucide-react';
import type { SplitDeploymentDTO } from '@/contracts/dto';
import { STATE_COPY } from '@/contracts/state-copy';
import { ApiClientError } from '@/client/http';
import { toStroops } from '@/lib/amount';
import * as data from '@/components/sme/data';
import { useSession } from '@/components/sme/session';
import { ErrorNotice, Loading, TestnetNote, btnPrimary, focusRing, inputCls, labelCls } from '@/components/sme/evidence';

// S-15. Recipients, order and bps come from the deployed Split and are read-only.
// The owner edits only labels and optional PHP planning figures.
const ERROR_TEXT: Record<string, string> = {
  NO_SPLIT_DEPLOYMENT: 'No prepared Split matches. Ask the operator.',
  ENVELOPES_MISMATCH_DEPLOYMENT: 'The envelopes do not match the registered Split deployment. Reload and try again.',
  BPS_TOTAL_INVALID: 'Envelope shares must total exactly 10,000 basis points.',
  APPROVER_SET_INVALID: 'The approver set must include at least one person other than the owner. Ask the operator.',
};

/** Pesos in, integer centavos out. Never converted to or from XLM. */
function pesosToCentavos(input: string): string | null | 'invalid' {
  const v = input.trim();
  if (v === '') return null;
  const m = /^(\d{1,15})(?:\.(\d{1,2}))?$/.exec(v);
  if (!m) return 'invalid';
  return (BigInt(m[1]) * BigInt(100) + BigInt((m[2] ?? '').padEnd(2, '0') || '0')).toString();
}

interface UiError { code?: string; message: string; fields?: Record<string, string> }

export default function NewBudgetPlanPage() {
  const router = useRouter();
  const { session, org } = useSession();
  const [deployment, setDeployment] = useState<SplitDeploymentDTO | null>(null);
  const [loadError, setLoadError] = useState<UiError | null>(null);
  const [purpose, setPurpose] = useState('');
  const [amount, setAmount] = useState('');
  const [labels, setLabels] = useState<string[]>([]);
  const [php, setPhp] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<UiError | null>(null);

  const orgId = org?.orgId;
  useEffect(() => {
    if (!orgId) return;
    data.getSplitDeployment(orgId).then(
      (d) => {
        setDeployment(d);
        setLabels(d.recipients.map((r) => r.label ?? `Envelope ${r.position + 1}`));
        setPhp(d.recipients.map(() => ''));
      },
      (e) => setLoadError(e instanceof ApiClientError
        ? { code: e.safe.code, message: ERROR_TEXT[e.safe.code] ?? e.safe.message }
        : { message: 'Could not load the Split deployment.' }),
    );
  }, [orgId]);

  if (!org) return <p className="text-sm">Your account is not a member of an organisation yet.</p>;
  if (org.role !== 'owner') return <ErrorNotice message="Only the organisation owner can create a budget plan." />;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!deployment || !org) return;
    setError(null);
    let totalStroops: string;
    try { totalStroops = toStroops(amount.trim()); } catch (e) { setError({ message: (e as Error).message }); return; }
    const envelopes = [];
    for (const [i, r] of deployment.recipients.entries()) {
      const centavos = pesosToCentavos(php[i] ?? '');
      if (centavos === 'invalid') {
        setError({ message: `Enter the ${labels[i]} planning figure as pesos, for example 50000 or 50000.50.` });
        return;
      }
      envelopes.push({ position: r.position, label: labels[i].trim(), bps: r.bps, recipientAddress: r.address, planningPhpCentavos: centavos });
    }
    setBusy(true);
    try {
      const created = await data.createPlan(org.orgId, { purpose: purpose.trim(), totalStroops, signerUserId: session.userId, envelopes });
      router.push(`/plans/${created.planId}?created=1`);
    } catch (e) {
      setBusy(false);
      if (e instanceof ApiClientError) setError({ code: e.safe.code, message: ERROR_TEXT[e.safe.code] ?? e.safe.message, fields: e.fields });
      else setError({ message: 'Could not save the plan.' });
    }
  }

  return (
    <div className="mx-auto max-w-[760px]">
      <Link href="/plans" className={`inline-flex items-center gap-2 rounded text-xs font-medium text-[#5f7167] hover:text-[#245742] ${focusRing}`}><ArrowLeft size={14} aria-hidden /> Back to budget plans</Link>
      <h1 className="mt-7 font-serif text-[34px] font-semibold tracking-[-0.04em] text-[#173b30] md:text-[40px]">New budget plan</h1>
      <p className="mt-2 text-sm leading-6 text-[#5f7167]">Recipients and shares are fixed by the deployed flow. Changing them needs a new flow and fresh approval.</p>

      {loadError && <div className="mt-6"><ErrorNotice message={loadError.message} code={loadError.code} /></div>}
      {!loadError && !deployment && <Loading label="Loading the prepared Split…" />}

      {deployment && (
        <form onSubmit={submit} className="mt-7 space-y-6 rounded-xl border border-[#e2e9e2] bg-white p-5 md:p-7">
          <div>
            <label htmlFor="purpose" className={labelCls}>Plan purpose</label>
            <input id="purpose" required maxLength={200} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. October operating budget" className={`${inputCls} mt-2`} />
          </div>
          <div>
            <label htmlFor="amount" className={labelCls}>Total amount (XLM, Testnet)</label>
            <input id="amount" inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1" className={`${inputCls} mt-2 font-mono`} />
            <p className="mt-1.5 text-[11px] text-[#6d7f75]">Up to 7 decimal places. Testnet — simulation, no real money.</p>
          </div>

          <fieldset>
            <legend className={labelCls}>Split envelopes</legend>
            <p className="mt-1 text-xs text-[#5f7167]">Address, share and order are read-only. You can rename an envelope and add an optional PHP planning figure.</p>
            <div className="mt-3 space-y-3">
              {deployment.recipients.map((r, i) => (
                <div key={r.position} className="rounded-lg border border-[#edf0ec] p-3.5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor={`label-${i}`} className="text-[11px] font-semibold text-[#365548]">Envelope {i + 1} label</label>
                      <input id={`label-${i}`} required maxLength={80} value={labels[i] ?? ''} onChange={(e) => setLabels((l) => l.map((v, j) => (j === i ? e.target.value : v)))} className={`${inputCls} mt-1.5 h-10`} />
                    </div>
                    <div>
                      <label htmlFor={`php-${i}`} className="text-[11px] font-semibold text-[#365548]">PHP planning figure <span className="font-normal text-[#6d7f75]">(optional)</span></label>
                      <input id={`php-${i}`} inputMode="decimal" value={php[i] ?? ''} onChange={(e) => setPhp((l) => l.map((v, j) => (j === i ? e.target.value : v)))} placeholder="0.00" aria-describedby={`php-note-${i}`} className={`${inputCls} mt-1.5 h-10 font-mono`} />
                      <p id={`php-note-${i}`} className="mt-1 text-[10px] text-[#6d7f75]">{STATE_COPY.phpPlanningFigure}</p>
                    </div>
                  </div>
                  <dl className="mt-3 space-y-1 text-xs text-[#52625a]">
                    <div className="flex gap-1.5"><dt className="font-semibold">Share</dt><dd className="font-mono">{r.bps / 100}% ({r.bps} bps)</dd></div>
                    <div className="flex gap-1.5"><dt className="font-semibold">Address</dt><dd className="break-all font-mono">{r.address}</dd></div>
                  </dl>
                </div>
              ))}
            </div>
          </fieldset>

          <p className="text-xs text-[#52625a]"><span className="font-semibold">Split deployment</span> <span className="break-all font-mono">{deployment.deploymentId}</span></p>

          <div aria-live="polite" className="space-y-2">
            {error && <ErrorNotice message={error.message} code={error.code} />}
            {error?.fields && Object.entries(error.fields).map(([k, v]) => <p key={k} className="text-xs text-[#7e2f23]">{k}: {v}</p>)}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-start gap-2 text-[11px] leading-5 text-[#5f7167]"><Info size={14} className="mt-0.5 shrink-0" aria-hidden />Saving records the plan and its hash. Approvers must then approve it.</p>
            <button type="submit" disabled={busy} className={btnPrimary}>{busy ? 'Saving…' : 'Save plan'}</button>
          </div>
          <TestnetNote />
        </form>
      )}
    </div>
  );
}
