'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import type { BudgetPlanSummaryDTO } from '@/contracts/dto';
import { ApiClientError } from '@/client/http';
import * as data from '@/components/sme/data';
import { useSession } from '@/components/sme/session';
import { DashboardBadge } from '@/components/sme/DashboardBadge';
import { ErrorNotice, Loading, PageHeader, TestnetNote, Xlm, btnPrimary, card, focusRing } from '@/components/sme/evidence';

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

  return (
    <div>
      <PageHeader eyebrow="Budget plans" title="Budget plans">
        {org?.role === 'owner' && (
          <Link href="/plans/new" className={btnPrimary}><Plus size={16} aria-hidden /> New budget plan</Link>
        )}
      </PageHeader>
      <p className="mt-2 max-w-[560px] text-sm leading-6 text-[#5f7167]">Record a plan, collect approvals, then track each payment envelope.</p>

      <section className={`${card} mt-8 overflow-hidden`} aria-labelledby="plans-heading" aria-live="polite">
        <h2 id="plans-heading" className="border-b border-[#edf0ec] px-5 py-4 text-sm font-semibold text-[#214638]">Plans</h2>
        {!org && <p className="px-6 py-10 text-center text-sm text-[#5f7167]">Your account is not a member of an organisation yet.</p>}
        {org && error && <div className="p-5"><ErrorNotice message={error} /></div>}
        {org && !error && plans === null && <Loading label="Loading budget plans…" />}
        {org && plans?.length === 0 && (
          <p className="px-6 py-10 text-center text-sm text-[#5f7167]">No budget plans yet.{org.role === 'owner' && ' Create the first one.'}</p>
        )}
        {plans && plans.length > 0 && (
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Budget plans with total, approvals and status</caption>
            <thead className="bg-[#f8faf7] text-[10px] uppercase tracking-[0.13em] text-[#6d7f75]">
              <tr>
                <th scope="col" className="px-5 py-2.5">Plan</th>
                <th scope="col" className="px-3 py-2.5">Total</th>
                <th scope="col" className="hidden px-3 py-2.5 sm:table-cell">Approvals</th>
                <th scope="col" className="px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.planId} className="border-t border-[#edf0ec]">
                  <td className="px-5 py-4">
                    <Link href={`/plans/${p.planId}`} className={`rounded font-semibold text-[#183b30] underline-offset-2 hover:underline ${focusRing}`}>{p.purpose}</Link>
                    <div className="mt-1 text-xs text-[#6d7f75]">Version {p.version}</div>
                  </td>
                  <td className="px-3 py-4"><Xlm stroops={p.totalStroops} /></td>
                  <td className="hidden px-3 py-4 text-xs text-[#52625a] sm:table-cell">{p.approvals.approved} of {p.approvals.required}</td>
                  <td className="px-3 py-4"><DashboardBadge state={p.dashboardState} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <div className="mt-4"><TestnetNote /></div>
    </div>
  );
}
