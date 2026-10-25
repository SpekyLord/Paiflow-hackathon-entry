'use client';

import { useState } from 'react';
import { useOperatorConsole } from '@/client/controllers';
import { useSession } from '@/components/sme/session';
import {
  ErrorNotice, HashChip, PageHeader, btnOutline, btnPrimary, card, formatPht, inputCls, labelCls,
} from '@/components/sme/evidence';

// S-20. Operator only. The server enforces OPERATOR_REQUIRED; this page just does not offer the console to others.
// XDR is never shown here.
const emptyRecipient = () => ({ label: '', address: '', bps: '' });

export default function OperatorPage() {
  const { session } = useSession();
  const op = useOperatorConsole();

  const [deploymentId, setDeploymentId] = useState('');
  const [snapshot, setSnapshot] = useState('');
  const [recipients, setRecipients] = useState([emptyRecipient(), emptyRecipient(), emptyRecipient()]);
  const [formError, setFormError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);

  const [resolving, setResolving] = useState<string | null>(null);
  const [outcome, setOutcome] = useState('');
  const [justification, setJustification] = useState('');
  const [notes, setNotes] = useState('');
  const [txHash, setTxHash] = useState('');
  const [resolveError, setResolveError] = useState<string | null>(null);

  if (!session.isOperator) return <ErrorNotice message="This page is for the operator only." code="OPERATOR_REQUIRED" />;

  const setRecipient = (i: number, patch: Partial<ReturnType<typeof emptyRecipient>>) =>
    setRecipients((list) => list.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  async function register(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const parsed = recipients.map((r, i) => ({ position: i, label: r.label.trim() || null, address: r.address.trim(), bps: Number(r.bps) }));
    if (parsed.some((r) => !Number.isInteger(r.bps) || r.bps <= 0)) { setFormError('Each share must be a whole number of basis points above 0.'); return; }
    if (parsed.reduce((s, r) => s + r.bps, 0) !== 10_000) { setFormError('Shares must total exactly 10,000 basis points.'); return; }
    setRegistering(true);
    await op.registerDeployment({
      deploymentId: deploymentId.trim(), template: 'budget_split', network: 'testnet', asset: { kind: 'native' },
      graphSnapshotSha256: snapshot.trim().toLowerCase(), splitRecipients: parsed,
      conditionNodeId: null, deadlineAt: null, sellerAddress: null, buyerAddress: null,
    });
    setRegistering(false);
  }

  async function resolve(event: React.FormEvent, reviewId: string) {
    event.preventDefault();
    setResolveError(null);
    if (!outcome.trim() || !justification.trim() || !notes.trim()) { setResolveError('Outcome, justification and evidence notes are required.'); return; }
    await op.resolveReview(reviewId, {
      outcome: outcome.trim(), justification: justification.trim(),
      evidence: { notes: notes.trim(), ...(txHash.trim() ? { stellarTxHash: txHash.trim().toLowerCase() } : {}) },
    });
    setResolving(null);
    setOutcome(''); setJustification(''); setNotes(''); setTxHash('');
  }

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Operator" title="Operator console">
        <button type="button" className={btnOutline} onClick={() => void op.reload()}>Reload</button>
      </PageHeader>
      {op.error && <ErrorNotice message={op.error.message} code={op.error.code} />}

      <section className={`${card} overflow-hidden`} aria-labelledby="reg-heading">
        <h2 id="reg-heading" className="border-b border-[#edf0ec] px-5 py-4 text-sm font-semibold text-[#214638]">Deployment registry</h2>
        {op.deployments.length === 0 ? <p className="px-5 py-8 text-center text-sm text-[#5f7167]">No deployments registered.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <caption className="sr-only">Registered deployments</caption>
              <thead className="bg-[#f8faf7] text-[10px] uppercase tracking-[0.13em] text-[#6d7f75]">
                <tr><th scope="col" className="px-5 py-2.5">Deployment</th><th scope="col" className="px-3">Template</th><th scope="col" className="px-3">Recipients (in order)</th><th scope="col" className="px-3">Status</th></tr>
              </thead>
              <tbody>
                {op.deployments.map((d) => (
                  <tr key={d.deploymentId} className="border-t border-[#edf0ec] align-top">
                    <td className="px-5 py-3"><div className="break-all font-mono text-xs">{d.deploymentId}</div><div className="mt-1 text-[11px] text-[#6d7f75]">Registered {formatPht(d.registeredAt)}</div><div className="mt-1"><HashChip value={d.graphSnapshotSha256} kind="sha256" /></div></td>
                    <td className="px-3 py-3 text-xs">{d.template}</td>
                    <td className="px-3 py-3 text-xs">
                      {d.splitRecipients ? (
                        <ol className="space-y-1">
                          {d.splitRecipients.map((r) => <li key={r.position}><span className="font-semibold">{r.position + 1}. {r.label ?? 'Recipient'}</span> · {r.bps} bps<div className="break-all font-mono text-[10px] text-[#6d7f75]">{r.address}</div></li>)}
                        </ol>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-3 text-xs font-semibold">{d.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <form onSubmit={register} className="space-y-4 border-t border-[#edf0ec] p-5" aria-labelledby="regform-heading">
          <h3 id="regform-heading" className="text-sm font-semibold text-[#214638]">Register a Split deployment</h3>
          <p className="text-xs text-[#52625a]">Template: budget Split, Testnet, native XLM. Enter the recipients in the deployed order. Another person should read the addresses back before you register.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="dep-id" className={labelCls}>Deployment UUID</label><input id="dep-id" required value={deploymentId} onChange={(e) => setDeploymentId(e.target.value)} className={`${inputCls} mt-2 font-mono`} /></div>
            <div><label htmlFor="dep-snap" className={labelCls}>Graph snapshot SHA-256</label><input id="dep-snap" required value={snapshot} onChange={(e) => setSnapshot(e.target.value)} className={`${inputCls} mt-2 font-mono`} /></div>
          </div>
          <fieldset className="space-y-3">
            <legend className={labelCls}>Recipients in deployment order</legend>
            {recipients.map((r, i) => (
              <div key={i} className="grid gap-3 sm:grid-cols-[140px_1fr_110px]">
                <div><label htmlFor={`r-label-${i}`} className="text-[11px] font-semibold text-[#365548]">{i + 1}. Label</label><input id={`r-label-${i}`} value={r.label} onChange={(e) => setRecipient(i, { label: e.target.value })} className={`${inputCls} mt-1 h-10`} /></div>
                <div><label htmlFor={`r-addr-${i}`} className="text-[11px] font-semibold text-[#365548]">{i + 1}. Address</label><input id={`r-addr-${i}`} required value={r.address} onChange={(e) => setRecipient(i, { address: e.target.value })} className={`${inputCls} mt-1 h-10 font-mono`} /></div>
                <div><label htmlFor={`r-bps-${i}`} className="text-[11px] font-semibold text-[#365548]">{i + 1}. Basis points</label><input id={`r-bps-${i}`} required inputMode="numeric" value={r.bps} onChange={(e) => setRecipient(i, { bps: e.target.value })} className={`${inputCls} mt-1 h-10 font-mono`} /></div>
              </div>
            ))}
          </fieldset>
          <div aria-live="polite">{formError && <ErrorNotice message={formError} />}</div>
          <button type="submit" disabled={registering} className={btnPrimary}>{registering ? 'Registering…' : 'Register deployment'}</button>
        </form>
      </section>

      <section className={`${card} p-5`} aria-labelledby="rev-heading">
        <h2 id="rev-heading" className="text-sm font-semibold text-[#214638]">Review queue</h2>
        {op.reviews.length === 0 ? <p className="mt-3 text-sm text-[#5f7167]">Nothing to review.</p> : (
          <ul className="mt-3 divide-y divide-[#edf0ec]">
            {op.reviews.map((r) => (
              <li key={r.reviewId} className="py-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><span className="font-semibold">{r.scope.replace('_', ' ')}</span> <span className="break-all font-mono text-[11px] text-[#6d7f75]">{r.refId}</span></div>
                  <span className="text-xs font-semibold">{r.resolvedAt ? `Resolved: ${r.outcome}` : 'Open'}</span>
                </div>
                <p className="mt-1 text-xs text-[#52625a]">{r.reason} · opened {formatPht(r.openedAt)}</p>
                {!r.resolvedAt && resolving !== r.reviewId && <button type="button" className={`${btnOutline} mt-2`} onClick={() => setResolving(r.reviewId)}>Resolve…</button>}
                {resolving === r.reviewId && (
                  <form onSubmit={(e) => void resolve(e, r.reviewId)} className="mt-3 space-y-3 rounded-lg border border-[#edf0ec] p-4">
                    <div><label htmlFor="res-outcome" className="text-[11px] font-semibold text-[#365548]">Outcome</label><input id="res-outcome" required value={outcome} onChange={(e) => setOutcome(e.target.value)} className={`${inputCls} mt-1 h-10`} /></div>
                    <div><label htmlFor="res-just" className="text-[11px] font-semibold text-[#365548]">Justification (required)</label><textarea id="res-just" required rows={3} value={justification} onChange={(e) => setJustification(e.target.value)} className={`${inputCls} mt-1 h-auto py-2`} /></div>
                    <div><label htmlFor="res-notes" className="text-[11px] font-semibold text-[#365548]">Evidence notes (required)</label><textarea id="res-notes" required rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputCls} mt-1 h-auto py-2`} /></div>
                    <div><label htmlFor="res-tx" className="text-[11px] font-semibold text-[#365548]">Stellar transaction hash checked on Stellar Expert (testnet), if any</label><input id="res-tx" value={txHash} onChange={(e) => setTxHash(e.target.value)} className={`${inputCls} mt-1 h-10 font-mono`} /></div>
                    {resolveError && <ErrorNotice message={resolveError} />}
                    <div className="flex gap-2"><button type="submit" className={btnPrimary}>Resolve review</button><button type="button" className={btnOutline} onClick={() => setResolving(null)}>Cancel</button></div>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
