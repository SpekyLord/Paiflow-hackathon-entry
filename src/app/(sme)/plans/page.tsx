'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Plus } from 'lucide-react';
import type { BudgetPlanSummaryDTO } from '@/contracts/dto';
import { ApiClientError } from '@/client/http';
import * as data from '@/components/sme/data';
import { useSession } from '@/components/sme/session';
import { DashboardBadge } from '@/components/sme/DashboardBadge';
import { ErrorNotice, Loading, TestnetNote, Xlm, btnPill, focusRing, panel, panelLime } from '@/components/sme/evidence';

export default function BudgetPlansPage() {
  const { org } = useSession();
  const [plans, setPlans] = useState<BudgetPlanSummaryDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const orgId = org?.orgId;
  useEffect(() => {
    if (!orgId) return;
    data.listPlans(orgId).then(
      (list) => { setPlans(list); setError(null); },
      (e) => setError(e instanceof ApiClientError ? e.safe.message : 'Could not load budget plans.'),
    );
  }, [orgId]);

  const verified = plans?.filter((p) => p.dashboardState === 'verified_distribution').length ?? 0;
  const awaiting = plans?.filter((p) => p.approvals.approved < p.approvals.required).length ?? 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.45fr_1fr]">
        <section className={`${panel} relative p-6 md:p-8`} aria-labelledby="plans-title">
          <p className="text-sm text-[#6a7a6e]">Budget plans</p>
          <h1 id="plans-title" className="mt-3 text-[40px] font-light leading-none tracking-[-0.04em] md:text-[56px]">
            {plans === null ? '—' : plans.length} <span className="text-xl text-[#6a7a6e]">{plans?.length === 1 ? 'plan' : 'plans'}</span>
          </h1>
          <p className="mt-4 max-w-[480px] text-sm leading-6 text-[#5f6f64]">Record a plan, collect approvals, then track each payment envelope.</p>
          {org?.role === 'owner' && (
            <div className="mt-6"><Link href="/plans/new" className={btnPill}><Plus size={16} aria-hidden /> New budget plan</Link></div>
          )}
        </section>

        <section className={`${panelLime} relative overflow-hidden p-6 md:p-8`} aria-label="Plan summary">
          <svg aria-hidden viewBox="0 0 100 100" className="pointer-events-none absolute -right-8 -top-6 size-48 text-[#a6e063]" fill="currentColor"><path d="M50 0c4 28 22 46 50 50-28 4-46 22-50 50-4-28-22-46-50-50 28-4 46-22 50-50z" /></svg>
          <dl className="relative grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/40 p-4"><dt className="text-xs opacity-80">Verified distribution</dt><dd className="mt-1 text-3xl font-light tabular-nums">{plans ? verified : '—'}</dd></div>
            <div className="rounded-2xl bg-white/40 p-4"><dt className="text-xs opacity-80">Awaiting approvals</dt><dd className="mt-1 text-3xl font-light tabular-nums">{plans ? awaiting : '—'}</dd></div>
          </dl>
          <p className="relative mt-5 text-[11px] opacity-80">A verified payout proves distribution, not that the money was well spent.</p>
        </section>
      </div>

      <section className={`${panel} p-6 md:p-8`} aria-labelledby="plans-heading" aria-live="polite">
        <h2 id="plans-heading" className="text-[15px] font-medium">Plans</h2>
        {!org && <p className="py-10 text-center text-sm text-[#5f6f64]">Your account is not a member of an organisation yet.</p>}
        {org && error && <div className="mt-4"><ErrorNotice message={error} /></div>}
        {org && !error && plans === null && <Loading label="Loading budget plans…" />}
        {org && plans?.length === 0 && (
          <p className="py-10 text-center text-sm text-[#5f6f64]">No budget plans yet.{org.role === 'owner' && ' Create the first one.'}</p>
        )}
        {plans && plans.length > 0 && (
          <ul className="mt-3 divide-y divide-[#eef0ec]">
            {plans.map((p) => (
              <li key={p.planId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-4 sm:grid-cols-[minmax(0,1.6fr)_1fr_auto_auto]">
                <div className="min-w-0">
                  <Link href={`/plans/${p.planId}`} className={`rounded font-medium underline-offset-2 hover:underline ${focusRing}`}>{p.purpose}</Link>
                  <div className="mt-0.5 text-xs text-[#6a7a6e]">Version {p.version} · Approvals {p.approvals.approved} of {p.approvals.required}</div>
                </div>
                <div className="text-right text-sm font-medium sm:text-left"><Xlm stroops={p.totalStroops} /></div>
                <div className="col-start-1 sm:col-start-auto"><DashboardBadge state={p.dashboardState} /></div>
                <Link href={`/plans/${p.planId}`} aria-label={`Open ${p.purpose}`} className={`grid size-9 place-items-center justify-self-end rounded-full bg-[#b5ee71] text-[#0f3a1c] hover:bg-[#a3e45b] ${focusRing}`}><ArrowUpRight size={16} aria-hidden /></Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <TestnetNote />
    </div>
  );
}
