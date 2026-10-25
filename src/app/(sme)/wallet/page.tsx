'use client';

import Link from 'next/link';
import { ArrowUpRight, RefreshCw, Wallet } from 'lucide-react';
import { useWalletSummary } from '@/client/controllers';
import type { WalletSummaryDTO } from '@/contracts/dto';
import type { DashboardState } from '@/contracts/states';
import { DASHBOARD_LABEL } from '@/contracts/state-copy';
import { fromStroops } from '@/lib/amount';
import { DashboardBadge } from '@/components/sme/DashboardBadge';
import {
  ErrorNotice, HashChip, Loading, TestnetNote, VerificationBadge, Xlm, btnPill, btnPillOutline, focusRing, formatPht, panel, panelLime,
} from '@/components/sme/evidence';

// S-13. Three separate panels, never summed. Unavailable balance is never shown as 0.
const ROLE_LABEL: Record<WalletSummaryDTO['plans'][number]['role'], string> = {
  owner: 'Owner', approver: 'Approver', signer: 'Signer', envelope_recipient: 'Envelope recipient',
};
const KIND_LABEL: Record<WalletSummaryDTO['history'][number]['kind'], string> = {
  budget_payment: 'Budget payment', envelope_payout: 'Envelope payout', deposit: 'Deposit', release: 'Release', refund: 'Refund',
};

// Fixed order and shades so the donut and its legend always agree. The legend carries text and counts, so colour is never the only cue.
const STATE_SHADE: Record<DashboardState, string> = {
  planned: '#d9dcd6', approved: '#8fd14a', pending: '#5a8f3a', verified_distribution: '#134223', needs_review: '#c4513f', closed: '#b0b5ac',
};
const STATE_ORDER = Object.keys(STATE_SHADE) as DashboardState[];

type EvidenceGroup = 'verified' | 'pending' | 'review';
const GROUP_LABEL: Record<EvidenceGroup, string> = { verified: 'Verified', pending: 'Pending evidence', review: 'Needs review' };

function groupOf(state: WalletSummaryDTO['history'][number]['verification']): EvidenceGroup {
  if (state === 'verified') return 'verified';
  if (state === 'mismatch' || state === 'operator_review') return 'review';
  return 'pending';
}

function CardTitle({ id, icon: Icon, children }: { id: string; icon: typeof Wallet; children: React.ReactNode }) {
  return (
    <h2 id={id} className="flex items-center gap-3 text-[15px] font-medium">
      <span className="grid size-9 place-items-center rounded-full border border-[#e4e8e1]" aria-hidden><Icon size={16} strokeWidth={1.7} /></span>
      {children}
    </h2>
  );
}

function Donut({ counts, total }: { counts: Record<DashboardState, number>; total: number }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative mx-auto size-[180px]">
      <svg viewBox="0 0 180 180" className="size-full -rotate-90" role="img" aria-label={`${total} plans by status`}>
        <circle cx="90" cy="90" r={r} fill="none" stroke="#eceee9" strokeWidth="16" />
        {total > 0 && STATE_ORDER.filter((s) => counts[s] > 0).map((s) => {
          const len = (counts[s] / total) * c;
          const seg = <circle key={s} cx="90" cy="90" r={r} fill="none" stroke={STATE_SHADE[s]} strokeWidth="16" strokeDasharray={`${Math.max(len - 3, 0)} ${c}`} strokeDashoffset={-offset} strokeLinecap="round" />;
          offset += len;
          return seg;
        })}
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <div className="text-3xl font-medium tabular-nums tracking-[-0.03em]">{total}</div>
        <div className="text-[11px] text-[#6a7a6e]">{total === 1 ? 'plan' : 'plans'}</div>
      </div>
    </div>
  );
}

export default function WalletPage() {
  const { data, loading, error, reload } = useWalletSummary();

  const planCounts = STATE_ORDER.reduce((acc, s) => ({ ...acc, [s]: 0 }), {} as Record<DashboardState, number>);
  data?.plans.forEach((p) => { planCounts[p.dashboardState] += 1; });
  const evidenceCounts: Record<EvidenceGroup, number> = { verified: 0, pending: 0, review: 0 };
  data?.history.forEach((h) => { evidenceCounts[groupOf(h.verification)] += 1; });
  const historyTotal = data?.history.length ?? 0;

  let balanceText: string | null = null;
  if (data?.balance.state === 'available') {
    try { balanceText = Number(fromStroops(data.balance.xlmStroops)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 7 }); } catch { balanceText = null; }
  }

  return (
    <div className="space-y-5">
      <p className="max-w-[620px] text-sm leading-6 text-[#5f6f64]">Stellar assets and Stellar wallets only. The three panels below are separate and are never added together.</p>

      {loading && !data && <Loading label="Loading wallet…" />}
      {error && <ErrorNotice message={error.message} code={error.code} />}

      {data && (
        <>
          <div className="grid gap-5 lg:grid-cols-[1.45fr_1fr]">
            {/* 1. Wallet balance + verified wallet */}
            <section className={`${panel} relative p-6 md:p-8`} aria-labelledby="bal-heading">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 id="bal-heading" className="text-sm text-[#6a7a6e]">1. Wallet balance <span className="ml-1 rounded-full bg-[#f1f3ef] px-2.5 py-1 text-[11px] font-medium text-[#134223]">XLM</span></h2>
                <div className="text-right text-xs text-[#6a7a6e]">
                  <div>Verified wallet</div>
                  {data.binding ? (
                    <div className="mt-1 max-w-[220px] break-all font-mono text-[11px] text-[#10261a]">{data.binding.address}</div>
                  ) : (
                    <div className="mt-1 text-[11px]">Not bound yet</div>
                  )}
                </div>
              </div>

              <div className="mt-6" aria-live="polite">
                {data.balance.state === 'available' && balanceText ? (
                  <>
                    <div className="break-words text-[44px] font-light leading-none tracking-[-0.04em] tabular-nums md:text-[64px]">{balanceText}</div>
                    <p className="mt-3 text-xs text-[#6a7a6e]">As of {formatPht(data.balance.asOf)}</p>
                  </>
                ) : (
                  <>
                    <div className="text-[40px] font-light leading-none tracking-[-0.03em] text-[#5f6f64] md:text-[52px]">Unavailable</div>
                    <p className="mt-3 text-xs text-[#6a7a6e]">The balance could not be read right now. This is not a zero balance.</p>
                  </>
                )}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3 pr-16">
                <Link href="/wallet/bind" className={btnPill}><Wallet size={15} aria-hidden /> {data.binding ? 'Wallet binding' : 'Bind Freighter wallet'}</Link>
                <button type="button" className={btnPillOutline} onClick={() => void reload()} disabled={loading}><RefreshCw size={14} aria-hidden /> Reload</button>
              </div>
              {data.binding && <p className="mt-3 text-[11px] text-[#6a7a6e]">Verified {formatPht(data.binding.verifiedAt)}</p>}
              <Link href="/plans" aria-label="Go to budget plans" className={`absolute bottom-6 right-6 grid size-14 place-items-center rounded-full bg-[#b5ee71] text-[#0f3a1c] transition-colors hover:bg-[#a3e45b] md:bottom-8 md:right-8 md:size-16 ${focusRing}`}>
                <ArrowUpRight size={24} aria-hidden />
              </Link>
            </section>

            {/* 3. Verified payouts */}
            <section className={`${panelLime} relative overflow-hidden p-6 md:p-8`} aria-labelledby="paid-heading">
              <svg aria-hidden viewBox="0 0 100 100" className="pointer-events-none absolute -right-8 -top-6 size-48 text-[#a6e063]" fill="currentColor"><path d="M50 0c4 28 22 46 50 50-28 4-46 22-50 50-4-28-22-46-50-50 28-4 46-22 50-50z" /></svg>
              <h2 id="paid-heading" className="relative inline-flex items-center gap-2 rounded-full bg-[#134223] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white">3. Verified payouts</h2>
              <dl className="relative mt-8 space-y-5">
                <div>
                  <dt className="text-sm opacity-80">Received (verified)</dt>
                  <dd className="mt-1 text-[34px] font-light leading-none tracking-[-0.03em] md:text-[44px]"><Xlm stroops={data.verifiedPayouts.receivedStroops || '0'} /></dd>
                </div>
                <div className="rounded-2xl bg-white/40 px-4 py-3">
                  <dt className="text-xs opacity-80">Refunded (verified)</dt>
                  <dd className="mt-1 text-xl font-medium"><Xlm stroops={data.verifiedPayouts.refundedStroops || '0'} /></dd>
                </div>
              </dl>
              <p className="relative mt-5 text-[11px] opacity-80">Only payouts with verified evidence are counted.</p>
            </section>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {/* 2. Payment status by plan */}
            <section className={`${panel} p-6`} aria-labelledby="plans-heading">
              <CardTitle id="plans-heading" icon={Wallet}>2. Payment status by plan</CardTitle>
              {data.plans.length === 0 ? <p className="mt-6 text-sm text-[#5f6f64]">No plans involve this wallet yet.</p> : (
                <>
                  <div className="mt-5"><Donut counts={planCounts} total={data.plans.length} /></div>
                  <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    {STATE_ORDER.filter((s) => planCounts[s] > 0).map((s) => (
                      <li key={s} className="flex items-center gap-2">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ background: STATE_SHADE[s] }} aria-hidden />
                        <span className="truncate">{DASHBOARD_LABEL[s]}</span>
                        <span className="ml-auto tabular-nums text-[#6a7a6e]">{planCounts[s]}</span>
                      </li>
                    ))}
                  </ul>
                  <ul className="mt-5 space-y-3 border-t border-[#eef0ec] pt-4">
                    {data.plans.map((p) => (
                      <li key={`${p.planId}-${p.role}`} className="text-sm">
                        <Link href={`/plans/${p.planId}`} className={`rounded font-medium hover:underline ${focusRing}`}>{p.purpose}</Link>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs"><DashboardBadge state={p.dashboardState} /><span className="text-[#6a7a6e]">Your role: {ROLE_LABEL[p.role]}</span></div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {data.escrow.length === 0 && <p className="mt-4 text-[11px] text-[#6a7a6e]">No protected-payment deals.</p>}
            </section>

            {/* Evidence status over the history */}
            <section className={`${panel} p-6`} aria-labelledby="evidence-heading">
              <CardTitle id="evidence-heading" icon={ArrowUpRight}>Evidence status</CardTitle>
              <div className="mt-6 text-[40px] font-light leading-none tracking-[-0.03em] tabular-nums">{evidenceCounts.verified}<span className="text-lg text-[#6a7a6e]"> of {historyTotal} verified</span></div>
              <p className="mt-2 text-xs text-[#6a7a6e]">Counts of the transactions in your history, by verification state.</p>
              <ul className="mt-6 space-y-5">
                {(Object.keys(GROUP_LABEL) as EvidenceGroup[]).map((g) => {
                  const pct = historyTotal ? Math.round((evidenceCounts[g] / historyTotal) * 100) : 0;
                  return (
                    <li key={g}>
                      <div className="flex items-baseline justify-between text-xs"><span className="text-[#5f6f64]">{GROUP_LABEL[g]}</span><span className="tabular-nums font-medium">{evidenceCounts[g]}</span></div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eceee9]" role="img" aria-label={`${GROUP_LABEL[g]}: ${evidenceCounts[g]} of ${historyTotal}`}>
                        <div className={`h-full rounded-full ${g === 'verified' ? 'bg-[#8fd14a]' : g === 'review' ? 'bg-[#c4513f]' : 'bg-[#b8bdb3]'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* History */}
            <section className={`${panel} p-6`} aria-labelledby="hist-heading">
              <CardTitle id="hist-heading" icon={RefreshCw}>History</CardTitle>
              {data.history.length === 0 ? <p className="mt-6 text-sm text-[#5f6f64]">No transactions yet.</p> : (
                <ul className="mt-4 divide-y divide-[#eef0ec]">
                  {data.history.map((h) => (
                    <li key={`${h.refId}-${h.stellarTxHash}`} className="py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{KIND_LABEL[h.kind]}</div>
                          <div className="mt-0.5 text-[11px] text-[#6a7a6e]">{formatPht(h.at)}</div>
                        </div>
                        <div className="shrink-0 text-right text-sm font-medium"><Xlm stroops={h.amountStroops} /></div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <VerificationBadge state={h.verification} />
                        <HashChip value={h.stellarTxHash} kind="stellarTxHash" explorer />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
      <TestnetNote />
    </div>
  );
}
