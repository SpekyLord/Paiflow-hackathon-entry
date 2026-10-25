'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, Check, RefreshCw } from 'lucide-react';
import type { BudgetPlanDetailDTO } from '@/contracts/dto';
import type { DashboardState } from '@/contracts/states';
import { DASHBOARD_LABEL, STATE_COPY } from '@/contracts/state-copy';
import { ApiClientError } from '@/client/http';
import { usePlanEvidence } from '@/client/controllers';
import * as data from '@/components/sme/data';
import { useSession } from '@/components/sme/session';
import { DashboardBadge } from '@/components/sme/DashboardBadge';
import { PaymentPanel } from '@/components/sme/PaymentPanel';
import { PlanTimeline } from '@/components/sme/PlanTimeline';
import {
  ErrorNotice, HashChip, Loading, PhpPlanning, TestnetChip, TestnetNote, VerificationBadge, Xlm,
  btnDanger, btnOutline, btnPrimary, card, focusRing, formatPht, inputCls,
} from '@/components/sme/evidence';

const STEPS: { key: DashboardState; label: string }[] = [
  { key: 'planned', label: DASHBOARD_LABEL.planned },
  { key: 'approved', label: DASHBOARD_LABEL.approved },
  { key: 'pending', label: DASHBOARD_LABEL.pending },
  { key: 'verified_distribution', label: DASHBOARD_LABEL.verified_distribution },
];

function progressText(plan: BudgetPlanDetailDTO): string {
  const { approved, required } = plan.approvals;
  switch (plan.state) {
    case 'draft':
    case 'pending_approval': return STATE_COPY.planned(approved, required);
    case 'approved': return STATE_COPY.approved;
    case 'payment_pending': return STATE_COPY.paymentPending;
    case 'payment_confirmed': return STATE_COPY.paymentConfirmed(plan.payoutsVerified.verified, plan.payoutsVerified.total);
    case 'distribution_verified': return STATE_COPY.distributionVerified;
    case 'mismatch':
    case 'operator_review': return STATE_COPY.mismatch;
    case 'rejected': return 'Changes requested: an approver rejected this version.';
    case 'superseded': return 'Superseded: a newer version of this plan exists.';
  }
}

function Dashboard({ plan }: { plan: BudgetPlanDetailDTO }) {
  const review = plan.dashboardState === 'needs_review';
  const closed = plan.dashboardState === 'closed';
  const current = STEPS.findIndex((s) => s.key === plan.dashboardState);
  // needs_review replaces the last step; the first three are reached.
  const reached = review ? 3 : current;
  return (
    <div>
      <ol className="grid gap-2 sm:grid-cols-4" aria-label="Plan progress">
        {STEPS.map((s, i) => {
          const isLast = i === STEPS.length - 1;
          const label = isLast && review ? DASHBOARD_LABEL.needs_review : s.label;
          const done = !closed && (i < reached || (i === reached && !review && plan.dashboardState === 'verified_distribution'));
          const active = !closed && i === reached && !done;
          return (
            <li key={s.key} aria-current={active ? 'step' : undefined}
              className={`rounded-lg border px-3 py-3 text-xs font-semibold ${done ? 'border-[#b9d3c4] bg-[#eaf4ee] text-[#1d5e3b]' : active ? (review && isLast ? 'border-[#e4b8b0] bg-[#fdf2ef] text-[#8f3326]' : 'border-[#174b3d] bg-white text-[#174b3d]') : 'border-[#e2e9e2] bg-[#f8faf7] text-[#6d7f75]'}`}>
              <span className="flex items-center gap-2">
                <span className="grid size-5 shrink-0 place-items-center rounded-full border border-current text-[10px]" aria-hidden>{done ? <Check size={11} /> : i + 1}</span>
                {label}
              </span>
              <span className="sr-only">{done ? ' (complete)' : active ? ' (current step)' : ' (not reached)'}</span>
            </li>
          );
        })}
      </ol>
      {closed && <p className="mt-2 text-xs text-[#5f7167]">This plan is closed.</p>}
    </div>
  );
}

function ApprovalsPanel({ plan, onChanged }: { plan: BudgetPlanDetailDTO; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const canApprove = plan.allowedActions.includes('approve');
  const canReject = plan.allowedActions.includes('reject');

  async function decide(kind: 'approve' | 'reject') {
    setBusy(true);
    setError(null);
    try {
      const body = { versionId: plan.versionId, planSha256: plan.planSha256 };
      if (kind === 'approve') await data.approvePlan(plan.orgId, plan.planId, body);
      else await data.rejectPlan(plan.orgId, plan.planId, { ...body, reason: reason.trim() });
      setRejecting(false);
      setReason('');
      await onChanged();
    } catch (e) {
      if (e instanceof ApiClientError && e.safe.code === 'STALE_VERSION') setError('A newer version exists; review it first.');
      else setError(e instanceof ApiClientError ? e.safe.message : 'Could not record your decision.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`${card} p-5`} aria-labelledby="appr-heading">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="appr-heading" className="text-sm font-semibold text-[#214638]">Approvals</h2>
        <span className="text-xs font-semibold text-[#3d5549]">{plan.approvals.approved} of {plan.approvals.required} approved</span>
      </div>
      <ul className="mt-3 divide-y divide-[#edf0ec]">
        {plan.approvalsDetail.map((a, i) => (
          <li key={i} className="py-2.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-[#25483a]">{a.approverName}{a.isViewer && <span className="ml-2 text-[10px] uppercase text-[#6d7f75]">you</span>}</span>
              <span className="text-xs font-semibold text-[#3d5549]">
                {a.decision === 'approved' ? 'Approved' : a.decision === 'rejected' ? 'Rejected' : 'Pending'}
                {a.decidedAt && <span className="ml-1.5 font-normal text-[#6d7f75]">{formatPht(a.decidedAt)}</span>}
              </span>
            </div>
            {a.reason && <p className="mt-1 text-xs text-[#52625a]">Reason: {a.reason}</p>}
          </li>
        ))}
      </ul>
      {(canApprove || canReject) && (
        <div className="mt-4 space-y-3">
          {!rejecting && (
            <div className="flex flex-wrap gap-2">
              {canApprove && <button type="button" className={btnPrimary} disabled={busy} onClick={() => void decide('approve')}>{busy ? 'Saving…' : 'Approve this version'}</button>}
              {canReject && <button type="button" className={btnDanger} disabled={busy} onClick={() => setRejecting(true)}>Reject…</button>}
            </div>
          )}
          {rejecting && (
            <div>
              <label htmlFor="reject-reason" className="text-xs font-semibold text-[#365548]">Reason for rejecting (required)</label>
              <textarea id="reject-reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className={`${inputCls} mt-1.5 h-auto py-2`} />
              <div className="mt-2 flex gap-2">
                <button type="button" className={btnDanger} disabled={busy || reason.trim().length === 0} onClick={() => void decide('reject')}>{busy ? 'Saving…' : 'Reject this version'}</button>
                <button type="button" className={btnOutline} disabled={busy} onClick={() => setRejecting(false)}>Cancel</button>
              </div>
            </div>
          )}
          <div aria-live="polite">{error && <ErrorNotice message={error} />}</div>
        </div>
      )}
    </section>
  );
}

export default function PlanDetailPage() {
  const { planId } = useParams<{ planId: string }>();
  const { org } = useSession();
  const orgId = org?.orgId ?? '';
  const ev = usePlanEvidence(orgId, planId, { auto: true });
  const { plan } = ev;

  if (!org) return <p className="text-sm">Your account is not a member of an organisation yet.</p>;

  return (
    <div className="space-y-6">
      <Link href="/plans" className={`inline-flex items-center gap-2 rounded text-xs font-medium text-[#5f7167] hover:text-[#245742] ${focusRing}`}><ArrowLeft size={14} aria-hidden /> Back to budget plans</Link>
      {ev.loading && !plan && <Loading label="Loading the plan…" />}
      {ev.error && !plan && <ErrorNotice message={ev.error.message} code={ev.error.code} />}

      {plan && (
        <>
          <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <div className="mb-2 flex items-center gap-2"><TestnetChip /><DashboardBadge state={plan.dashboardState} /></div>
              <h1 className="font-serif text-[32px] font-semibold leading-tight tracking-[-0.04em] text-[#173b30] md:text-[40px]">{plan.purpose}</h1>
              <p className="mt-2 text-sm text-[#52625a]">Total <Xlm stroops={plan.totalStroops} /> · version {plan.version}</p>
            </div>
            <button type="button" className={btnOutline} onClick={() => void ev.refreshEvidence()} disabled={ev.refreshing}>
              <RefreshCw size={14} className={ev.refreshing ? 'animate-spin' : ''} aria-hidden /> {ev.refreshing ? 'Refreshing…' : 'Refresh evidence'}
            </button>
          </header>

          <section className={`${card} p-5`} aria-labelledby="progress-heading">
            <h2 id="progress-heading" className="sr-only">Progress</h2>
            <Dashboard plan={plan} />
            <p className="mt-4 text-base font-semibold text-[#173b30]" role="status" aria-live="polite">{progressText(plan)}</p>
            <p className="mt-1 text-xs text-[#5f7167]">A verified payout proves distribution, not that the money was well spent. Testnet — simulation, no real money.</p>
            {ev.lastRefreshedAt && <p className="mt-1 text-[11px] text-[#6d7f75]">Evidence last refreshed {formatPht(ev.lastRefreshedAt)}</p>}
            {ev.error && <div className="mt-3"><ErrorNotice message={ev.error.message} code={ev.error.code} /></div>}
          </section>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="space-y-6">
              <section className={`${card} p-5`} aria-labelledby="facts-heading">
                <h2 id="facts-heading" className="text-sm font-semibold text-[#214638]">Plan facts</h2>
                <dl className="mt-3 space-y-2.5 text-sm">
                  <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-[#6d7f75]">Plan hash</dt><dd className="mt-0.5"><HashChip value={plan.planSha256} kind="sha256" /></dd></div>
                  {plan.ledgerBlockId != null && <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-[#6d7f75]">CYFER ledger block</dt><dd className="mt-0.5 text-xs">#{plan.ledgerBlockId} (application record, not a Stellar transaction)</dd></div>}
                  <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-[#6d7f75]">Authorised signer</dt><dd className="mt-0.5">{plan.signer.displayName} <span className="break-all font-mono text-xs text-[#52625a]">{plan.signer.address}</span></dd></div>
                  <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-[#6d7f75]">Split deployment</dt><dd className="mt-0.5 break-all font-mono text-xs">{plan.deployment.id}</dd></div>
                </dl>
              </section>

              <section className={`${card} overflow-hidden`} aria-labelledby="env-heading">
                <h2 id="env-heading" className="border-b border-[#edf0ec] px-5 py-4 text-sm font-semibold text-[#214638]">Envelopes</h2>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <caption className="sr-only">Envelopes with expected shares and payout verification</caption>
                    <thead className="bg-[#f8faf7] text-[10px] uppercase tracking-[0.13em] text-[#6d7f75]">
                      <tr><th scope="col" className="px-5 py-2.5">Envelope</th><th scope="col" className="px-3">Expected share</th><th scope="col" className="px-3">PHP planning</th><th scope="col" className="px-3">Payout</th></tr>
                    </thead>
                    <tbody>
                      {plan.envelopes.map((e) => (
                        <tr key={e.position} className="border-t border-[#edf0ec] align-top">
                          <td className="px-5 py-3">
                            <div className="font-semibold text-[#25483a]">{e.label}</div>
                            <div className="text-xs text-[#52625a]">{e.bps / 100}% ({e.bps} bps)</div>
                            <div className="mt-0.5 break-all font-mono text-[10px] text-[#6d7f75]">{e.recipientAddress}</div>
                          </td>
                          <td className="px-3 py-3"><Xlm stroops={e.expectedShareStroops} /></td>
                          <td className="px-3 py-3 text-xs"><PhpPlanning centavos={e.planningPhpCentavos} /></td>
                          <td className="px-3 py-3">
                            {e.payout ? (
                              <div className="space-y-1.5">
                                <VerificationBadge state={e.payout.state} />
                                {e.payout.state === 'verified' && <div className="text-xs font-semibold text-[#1d5e3b]">{STATE_COPY.envelopePaidVerified(e.label)}</div>}
                                {e.payout.state === 'mismatch' && <div className="text-xs text-[#8f3326]">{STATE_COPY.mismatch}</div>}
                                {e.payout.stellarTxHash && <HashChip value={e.payout.stellarTxHash} kind="stellarTxHash" explorer />}
                              </div>
                            ) : <span className="text-xs text-[#6d7f75]">Not started</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {plan.paymentReceipt && (
                  <div className="space-y-1.5 border-t border-[#edf0ec] px-5 py-4 text-xs">
                    <div className="flex items-center gap-2 font-semibold text-[#25483a]">Payment transaction <VerificationBadge state={plan.paymentReceipt.state} /></div>
                    {plan.paymentReceipt.state !== 'verified' && <p className="text-[#52625a]">{STATE_COPY.confirmedNotVerified}</p>}
                    {plan.paymentReceipt.stellarTxHash && <HashChip value={plan.paymentReceipt.stellarTxHash} kind="stellarTxHash" explorer />}
                  </div>
                )}
              </section>

              <section className={`${card} p-5`} aria-labelledby="tl-heading">
                <h2 id="tl-heading" className="mb-4 text-sm font-semibold text-[#214638]">Timeline</h2>
                <PlanTimeline entries={plan.timeline} />
              </section>
            </div>

            <div className="space-y-6">
              <ApprovalsPanel plan={plan} onChanged={ev.reload} />
              <PaymentPanel plan={plan} onChanged={ev.reload} />
              <TestnetNote />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
