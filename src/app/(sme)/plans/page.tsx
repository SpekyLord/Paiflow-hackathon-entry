import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, Plus, Search, ShieldCheck, Wallet } from 'lucide-react';
import { allPlanStateFixtures, FIXTURE_MARKER } from '@/contracts/fixtures';
import type { BudgetPlanDetailDTO } from '@/contracts/dto';

const plans = [
  allPlanStateFixtures().find((plan) => plan.state === 'pending_approval')!,
  allPlanStateFixtures().find((plan) => plan.state === 'distribution_verified')!,
  allPlanStateFixtures().find((plan) => plan.state === 'draft')!,
];

const states: Record<string, { label: string; tone: string; detail: string }> = {
  draft: { label: 'Draft', tone: 'bg-[#f0f2ef] text-[#64736b]', detail: 'Ready for review' },
  pending_approval: { label: 'Needs approval', tone: 'bg-[#fff2d9] text-[#8a5b13]', detail: 'Waiting for approvers' },
  approved: { label: 'Approved', tone: 'bg-[#e8f2e9] text-[#34734b]', detail: 'Ready to pay' },
  payment_pending: { label: 'Payment pending', tone: 'bg-[#e9eff8] text-[#42648c]', detail: 'Check payment status' },
  payment_confirmed: { label: 'Payment received', tone: 'bg-[#e9eff8] text-[#42648c]', detail: 'Verifying envelopes' },
  distribution_verified: { label: 'Verified', tone: 'bg-[#e5f1e7] text-[#286843]', detail: 'All envelopes verified' },
  mismatch: { label: 'Needs review', tone: 'bg-[#fce9e6] text-[#a24637]', detail: 'A payout needs review' },
  operator_review: { label: 'Under review', tone: 'bg-[#f2ecfa] text-[#715197]', detail: 'Payment status is unclear' },
  rejected: { label: 'Changes requested', tone: 'bg-[#fce9e6] text-[#a24637]', detail: 'Review approver feedback' },
  superseded: { label: 'Superseded', tone: 'bg-[#f0f2ef] text-[#64736b]', detail: 'A newer version exists' },
};

function formatXlm(stroops: string) {
  return (Number(stroops) / 10_000_000).toLocaleString('en-PH', { maximumFractionDigits: 2 });
}

function PlanRow({ plan }: { plan: BudgetPlanDetailDTO }) {
  const status = states[plan.state] ?? states.draft;
  return (
    <div className="grid gap-4 border-b border-[#edf0ec] px-5 py-5 last:border-0 md:grid-cols-[minmax(0,1.6fr)_0.7fr_0.7fr_0.8fr] md:items-center md:px-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold text-[#183b30]">{plan.purpose.replace(`${FIXTURE_MARKER} `, '')}</span>
          <span className="rounded border border-[#e2e9e2] bg-[#f8faf7] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#7b8a81]">Sample</span>
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-xs text-[#89968e]"><span>Updated Oct 25</span><span>·</span><span>Version {plan.version}</span></div>
      </div>
      <div className="flex items-center justify-between md:block">
        <span className="text-[11px] text-[#8a9890] md:hidden">Amount</span>
        <span className="font-mono text-[13px] font-medium tabular-nums text-[#294c3e]">{formatXlm(plan.totalStroops)} <span className="text-[#829087]">XLM</span></span>
      </div>
      <div className="flex items-center justify-between md:block">
        <span className="text-[11px] text-[#8a9890] md:hidden">Approvals</span>
        <span className="text-xs text-[#63746b]">{plan.approvals.approved} of {plan.approvals.required}</span>
      </div>
      <div className="flex items-center justify-between md:justify-start">
        <span className="text-[11px] text-[#8a9890] md:hidden">Status</span>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${status.tone}`}><span className="size-1.5 rounded-full bg-current" />{status.label}</span>
      </div>
    </div>
  );
}

export default function BudgetPlansPage() {
  const approved = plans.filter((plan) => plan.approvals.approved === plan.approvals.required).length;
  const verified = plans.filter((plan) => plan.payoutsVerified.verified === plan.payoutsVerified.total).length;

  return (
    <div>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#78887f]"><span className="size-1.5 rounded-full bg-[#4e8a62]" /> Sample workspace</div>
          <h1 className="font-serif text-[34px] font-semibold leading-tight tracking-[-0.04em] text-[#173b30] md:text-[42px]">Budget plans</h1>
          <p className="mt-2 max-w-[520px] text-sm leading-6 text-[#718078]">Create a plan, collect approvals, then track each payment envelope.</p>
        </div>
        <Link href="/plans/new" className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-lg bg-[#174b3d] px-4 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[#23624f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#26715b] sm:self-auto"><Plus size={16} /> New budget plan</Link>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Total plans" value="03" note="Across this workspace" icon={<Wallet size={17} />} />
        <SummaryCard label="Fully approved" value={`0${approved}`} note="Ready for payment" icon={<ShieldCheck size={17} />} />
        <SummaryCard label="Verified payouts" value={`0${verified}`} note="All envelopes checked" icon={<ArrowDownLeft size={17} />} />
      </div>

      <section className="mt-8 overflow-hidden rounded-xl border border-[#e2e9e2] bg-white shadow-[0_1px_2px_rgba(25,56,43,0.03)]" aria-labelledby="plans-heading">
        <div className="flex flex-col gap-4 border-b border-[#edf0ec] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div><h2 id="plans-heading" className="text-sm font-semibold text-[#214638]">Recent plans</h2><p className="mt-1 text-xs text-[#8a9890]">Sample records for the interface preview</p></div>
          <button type="button" aria-label="Search plans (preview only)" className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#e4eae4] px-3 text-xs text-[#87958c] hover:bg-[#f8faf7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#26715b]"><Search size={14} /> Search plans</button>
        </div>
        <div className="hidden grid-cols-[minmax(0,1.6fr)_0.7fr_0.7fr_0.8fr] gap-4 bg-[#f8faf7] px-6 py-2.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#99a49d] md:grid">
          <span>Plan</span><span>Amount</span><span>Approvals</span><span>Status</span>
        </div>
        {plans.map((plan) => <PlanRow key={plan.planId + plan.state} plan={plan} />)}
      </section>

      <div className="mt-5 flex items-start gap-3 rounded-lg border border-[#e3e9e3] bg-[#f9fbf8] px-4 py-3.5 text-xs leading-5 text-[#78867e]"><ArrowUpRight size={15} className="mt-0.5 shrink-0 text-[#6c8c76]" /><p><strong className="font-semibold text-[#4f695a]">Preview data.</strong> These plans are fixtures for the UI build. No account, approval, payment, or database record is being changed.</p></div>
    </div>
  );
}

function SummaryCard({ label, value, note, icon }: { label: string; value: string; note: string; icon: React.ReactNode }) {
  return <div className="rounded-xl border border-[#e2e9e2] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(25,56,43,0.03)]"><div className="flex items-center justify-between"><span className="text-xs font-medium text-[#77867e]">{label}</span><span className="text-[#8ba091]">{icon}</span></div><div className="mt-3 flex items-end justify-between"><span className="font-serif text-[30px] font-semibold leading-none tracking-[-0.04em] text-[#214638]">{value}</span><span className="text-[10px] text-[#a0aaa3]">{note}</span></div></div>;
}
