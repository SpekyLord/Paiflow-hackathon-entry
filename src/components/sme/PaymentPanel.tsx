'use client';

// S-17. Signer-only payment controls. Every financial decision is the server's; this component renders the
// usePayment() phase and the plan's allowedActions. There is never a "pay again" button.

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, Lock, X } from 'lucide-react';
import type { BudgetPlanDetailDTO } from '@/contracts/dto';
import { STATE_COPY } from '@/contracts/state-copy';
import { usePayment } from '@/client/controllers';
import { ErrorNotice, HashChip, TestnetChip, Xlm, btnDanger, btnOutline, btnPrimary, card, formatPht } from './evidence';

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [left, setLeft] = useState(() => Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000)));
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000))), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  return <span className="font-mono tabular-nums" role="timer">{left === 0 ? 'Expired' : `${mm}:${ss}`}</span>;
}

function Dialog({ title, onClose, closable, children }: { title: string; onClose: () => void; closable: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onKeyDown={(e) => { if (e.key === 'Escape' && closable) onClose(); }}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="dlg-title" className="max-h-[92vh] w-full max-w-[560px] overflow-y-auto rounded-xl bg-white p-6 shadow-xl focus:outline-none">
        <div className="flex items-start justify-between gap-4">
          <h2 id="dlg-title" className="font-serif text-2xl font-semibold text-[#173b30]">{title}</h2>
          {closable && <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-[#5f7167] hover:bg-[#eef3ee]"><X size={18} aria-hidden /></button>}
        </div>
        {children}
      </div>
    </div>
  );
}

export function PaymentPanel({ plan, onChanged }: { plan: BudgetPlanDetailDTO; onChanged: () => Promise<void> | void }) {
  const pay = usePayment({ kind: 'plan', orgId: plan.orgId, planId: plan.planId });
  const [open, setOpen] = useState(false);
  const [confirmResubmit, setConfirmResubmit] = useState(false);

  const actions = plan.allowedActions;
  const isSigner = plan.viewerRoles.includes('signer');
  const blocked = actions.includes('pay_blocked_until_approved');
  const canStart = actions.includes('pay') || actions.includes('continue_payment');
  const canCheck = actions.includes('check_payment');
  const canResubmit = actions.includes('resubmit_same_envelope');
  const unresolved = pay.phase === 'unresolved' || plan.payment?.state === 'unknown';

  // After the payment settles, ask the plan to reload so the dashboard reflects the server's state.
  useEffect(() => {
    if (pay.phase === 'confirmed' || pay.phase === 'unresolved' || pay.phase === 'failed') void onChanged();
  }, [pay.phase, onChanged]);

  if (!isSigner && !canCheck && !blocked) return null;

  const modalOpen = open && pay.phase !== 'idle';
  const inFlight = pay.busy || ['preparing', 'awaiting_signature', 'submitting', 'checking'].includes(pay.phase);
  const review = pay.review;

  return (
    <section className={`${card} p-5`} aria-labelledby="pay-heading">
      <h2 id="pay-heading" className="text-sm font-semibold text-[#214638]">Payment</h2>
      <div className="mt-1"><TestnetChip /></div>

      {blocked && (
        <div className="mt-4">
          <button type="button" disabled aria-describedby="pay-blocked" className={btnPrimary}><Lock size={14} aria-hidden /> Sign payment</button>
          <p id="pay-blocked" className="mt-2 text-xs text-[#52625a]">{STATE_COPY.payBlocked(plan.approvals.approved, plan.approvals.required)}</p>
          {isSigner && (
            <div className="mt-3">
              <button type="button" className={btnOutline} onClick={() => { setOpen(true); void pay.start(); }} disabled={pay.busy}>
                Try anyway (demo: the server will refuse)
              </button>
            </div>
          )}
        </div>
      )}
      {!modalOpen && pay.phase === 'refused_not_approved' && (
        <div className="mt-3" aria-live="polite"><ErrorNotice message="Payment cannot proceed until every approver has approved." code="PLAN_NOT_APPROVED" /></div>
      )}

      {canStart && isSigner && (
        <div className="mt-4">
          <button type="button" className={btnPrimary} disabled={pay.busy} onClick={() => { setOpen(true); void pay.start(); }}>Review and sign payment</button>
          <p className="mt-2 text-xs text-[#52625a]">You will see the total and each recipient before anything is signed.</p>
        </div>
      )}

      {(unresolved || canCheck) && (
        <div className="mt-4 space-y-3" aria-live="polite">
          {unresolved && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-[#e4b8b0] bg-[#fdf2ef] px-3.5 py-3 text-sm font-semibold text-[#7e2f23]">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden /> {STATE_COPY.outcomeUnknown}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {plan.payment && (
              <button type="button" className={btnOutline} disabled={pay.busy} onClick={() => void pay.checkOriginal()}>
                {pay.phase === 'checking' ? 'Checking…' : 'Check original transaction'}
              </button>
            )}
            {canResubmit && isSigner && (
              <button type="button" className={btnDanger} disabled={pay.busy} onClick={() => setConfirmResubmit(true)}>Resubmit same signed envelope</button>
            )}
          </div>
          <p className="text-[11px] text-[#5f7167]">Checking is read-only. There is no way to pay again from here.</p>
          {pay.error && <ErrorNotice message={pay.error.message} code={pay.error.code} />}
        </div>
      )}

      {confirmResubmit && (
        <Dialog title="Resubmit the same signed envelope?" onClose={() => setConfirmResubmit(false)} closable>
          <p className="mt-3 text-sm leading-6 text-[#3d5549]">
            This re-sends the identical signed transaction you already signed. It does not create a new payment and nothing new is signed.
            Use it only after checking the original transaction.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={btnOutline} onClick={() => setConfirmResubmit(false)}>Cancel</button>
            <button type="button" className={btnDanger} onClick={() => { setConfirmResubmit(false); void pay.resubmitSameEnvelope(); }}>Resubmit same signed envelope</button>
          </div>
        </Dialog>
      )}

      {modalOpen && (
        <Dialog title="Sign payment" onClose={() => { pay.stopChecking(); setOpen(false); }} closable={!inFlight}>
          <div className="mt-2"><TestnetChip /></div>
          <div aria-live="polite" className="mt-4 space-y-4 text-sm text-[#25483a]">
            {pay.phase === 'preparing' && <p className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" aria-hidden /> Preparing the payment…</p>}

            {review && ['review', 'awaiting_signature', 'submitting', 'checking', 'expired', 'wallet_changed'].includes(pay.phase) && (
              <>
                <dl className="space-y-2 rounded-lg border border-[#edf0ec] p-3.5">
                  <div className="flex justify-between gap-3"><dt className="font-semibold">Total</dt><dd><Xlm stroops={review.amountStroops} /></dd></div>
                  <div className="flex justify-between gap-3"><dt className="font-semibold">Asset</dt><dd>{review.asset.kind === 'native' ? 'XLM (native)' : review.asset.symbol}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="font-semibold">Network fee</dt><dd>{review.feeStroops ? <Xlm stroops={review.feeStroops} /> : 'Shown in Freighter'}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="font-semibold">Expires in</dt><dd><Countdown expiresAt={review.expiresAt} /> <span className="text-[11px] text-[#6d7f75]">({formatPht(review.expiresAt)})</span></dd></div>
                  <div className="flex justify-between gap-3"><dt className="font-semibold">Deployment</dt><dd className="break-all text-right font-mono text-xs">{review.deploymentId}</dd></div>
                </dl>
                <table className="w-full text-left text-xs">
                  <caption className="mb-1 text-left text-xs font-semibold">Recipients and expected shares</caption>
                  <thead className="text-[10px] uppercase tracking-wide text-[#6d7f75]"><tr><th scope="col" className="py-1">Envelope</th><th scope="col">Address</th><th scope="col" className="text-right">Expected share</th></tr></thead>
                  <tbody>
                    {review.recipients.map((r) => (
                      <tr key={r.address} className="border-t border-[#edf0ec]">
                        <td className="py-1.5 font-semibold">{r.label}</td>
                        <td className="font-mono" title={r.address}>{r.address.slice(0, 6)}…{r.address.slice(-6)}</td>
                        <td className="text-right"><Xlm stroops={r.expectedShareStroops} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-[11px] text-[#5f7167]">Testnet — simulation, no real money. Freighter will show the network, source account and fee before you sign.</p>
              </>
            )}

            {pay.phase === 'review' && <button type="button" className={`${btnPrimary} w-full`} disabled={pay.busy} onClick={() => void pay.signAndSubmit()}>Sign in Freighter</button>}
            {pay.phase === 'awaiting_signature' && <p className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" aria-hidden /> Waiting for your signature in Freighter…</p>}
            {pay.phase === 'submitting' && <p className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" aria-hidden /> Submitting the signed transaction…</p>}
            {pay.phase === 'checking' && <p className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" aria-hidden /> Checking the transaction status…</p>}

            {pay.phase === 'wallet_changed' && <ErrorNotice message="Freighter is on a different account than your verified wallet. Switch accounts, then start again." code="WALLET_MISMATCH" />}
            {pay.phase === 'expired' && <ErrorNotice message="This prepared payment expired before it was signed. Nothing was sent. Close this window and start again." />}
            {pay.phase === 'refused_not_approved' && <ErrorNotice message="Payment cannot proceed until every approver has approved." code="PLAN_NOT_APPROVED" />}
            {pay.phase === 'failed' && <ErrorNotice message="The transaction was reported as failed. Check the plan page for the recorded status before doing anything else." />}
            {pay.phase === 'unresolved' && (
              <div role="alert" className="rounded-lg border border-[#e4b8b0] bg-[#fdf2ef] px-3.5 py-3 font-semibold text-[#7e2f23]">{STATE_COPY.outcomeUnknown}</div>
            )}
            {pay.phase === 'confirmed' && (
              <div className="rounded-lg border border-[#b9d3c4] bg-[#eaf4ee] px-3.5 py-3">
                <p className="font-semibold text-[#1d5e3b]">Transaction confirmed</p>
                <p className="mt-1 text-xs text-[#3d5549]">{STATE_COPY.confirmedNotVerified}. Each envelope is marked only after its payout is verified.</p>
                {pay.attempt?.originalTxHash && <div className="mt-2"><HashChip value={pay.attempt.originalTxHash} kind="stellarTxHash" explorer /></div>}
              </div>
            )}
            {pay.phase === 'error' && pay.error && <ErrorNotice message={pay.error.message} code={pay.error.code} />}
          </div>
          {!inFlight && (
            <div className="mt-5 flex justify-end">
              <button type="button" className={btnOutline} onClick={() => setOpen(false)}>Close</button>
            </div>
          )}
        </Dialog>
      )}
    </section>
  );
}
