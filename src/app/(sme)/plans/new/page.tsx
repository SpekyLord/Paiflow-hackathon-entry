'use client';

import Link from 'next/link';
import { ArrowLeft, Check, Info } from 'lucide-react';
import { useState } from 'react';

export default function NewBudgetPlanPage() {
  const [purpose, setPurpose] = useState('');
  const [amount, setAmount] = useState('');
  const [preview, setPreview] = useState(false);

  return (
    <div className="mx-auto max-w-[760px]">
      <Link href="/plans" className="inline-flex items-center gap-2 text-xs font-medium text-[#728279] hover:text-[#245742] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#26715b]"><ArrowLeft size={14} /> Back to budget plans</Link>
      <div className="mt-7"><div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#78887f]">Budget plan · preview</div><h1 className="font-serif text-[34px] font-semibold tracking-[-0.04em] text-[#173b30] md:text-[40px]">Start a budget plan</h1><p className="mt-2 text-sm leading-6 text-[#718078]">Describe the plan and check how the fixed Split envelopes divide the amount.</p></div>

      <form onSubmit={(event) => { event.preventDefault(); setPreview(true); }} className="mt-7 rounded-xl border border-[#e2e9e2] bg-white p-5 shadow-[0_1px_2px_rgba(25,56,43,0.03)] md:p-7">
        <label htmlFor="purpose" className="block text-xs font-semibold text-[#365548]">Plan purpose</label>
        <input id="purpose" value={purpose} onChange={(event) => { setPurpose(event.target.value); setPreview(false); }} maxLength={120} required placeholder="e.g. October operating budget" className="mt-2 h-11 w-full rounded-lg border border-[#dfe7df] bg-[#fcfdfb] px-3.5 text-sm text-[#25483a] placeholder:text-[#a0aaa3] focus:border-[#6d9a7b] focus:outline-none focus:ring-2 focus:ring-[#d9eadc]" />

        <label htmlFor="amount" className="mt-6 block text-xs font-semibold text-[#365548]">Total amount <span className="font-normal text-[#849188]">· XLM</span></label>
        <div className="mt-2 flex h-11 items-center rounded-lg border border-[#dfe7df] bg-[#fcfdfb] focus-within:border-[#6d9a7b] focus-within:ring-2 focus-within:ring-[#d9eadc]"><input id="amount" type="number" min="0.0000001" step="0.0000001" value={amount} onChange={(event) => { setAmount(event.target.value); setPreview(false); }} required placeholder="0.00" className="h-full min-w-0 flex-1 bg-transparent px-3.5 font-mono text-sm text-[#25483a] placeholder:text-[#a0aaa3] focus:outline-none" /><span className="px-3 text-xs font-semibold text-[#849188]">XLM</span></div>

        <div className="mt-7 border-t border-[#edf0ec] pt-5"><div className="flex items-center justify-between"><div><h2 className="text-xs font-semibold text-[#365548]">Split envelopes</h2><p className="mt-1 text-xs text-[#87948c]">Shares are fixed by the selected deployment.</p></div><span className="rounded-full bg-[#edf4ed] px-2.5 py-1 text-[10px] font-semibold text-[#497456]">100% allocated</span></div>
          <div className="mt-4 space-y-2.5">
            {[
              { name: 'Operations', percent: '50%', bps: '5,000 bps', color: '#4c8060' },
              { name: 'Payroll', percent: '30%', bps: '3,000 bps', color: '#91ad8b' },
              { name: 'Supplies', percent: '20%', bps: '2,000 bps', color: '#c1d0b7' },
            ].map((item) => <div key={item.name} className="flex items-center gap-3 rounded-lg border border-[#edf0ec] px-3.5 py-3"><span className="size-2.5 rounded-full" style={{ background: item.color }} /><span className="flex-1 text-xs font-medium text-[#476052]">{item.name}</span><span className="w-20 text-right font-mono text-xs text-[#536a5c]">{item.percent}</span><span className="hidden w-20 text-right text-[10px] text-[#98a39b] sm:block">{item.bps}</span></div>)}
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><p className="flex items-start gap-2 text-[11px] leading-5 text-[#86938b]"><Info size={14} className="mt-0.5 shrink-0" />Preview only · nothing is saved or submitted</p><button type="submit" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#174b3d] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#23624f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#26715b]">Preview plan <Check size={14} /></button></div>
      </form>

      {preview && <section aria-live="polite" className="mt-4 rounded-xl border border-[#cbdccf] bg-[#f4f9f3] p-5"><div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#67806d]">Plan preview</div><div className="mt-2 flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-sm font-semibold text-[#254b38]">{purpose}</h2><span className="font-mono text-sm font-semibold text-[#254b38]">{Number(amount || 0).toLocaleString('en-PH', { maximumFractionDigits: 7 })} XLM</span></div><div className="mt-3 text-xs leading-5 text-[#6d7f70]">Operations {Number(amount || 0) * 0.5} XLM · Payroll {Number(amount || 0) * 0.3} XLM · Supplies {Number(amount || 0) * 0.2} XLM</div><p className="mt-3 border-t border-[#dce9dc] pt-3 text-[11px] text-[#768a78]">This preview is local to your browser. Approval and saving will be connected after the workspace backend is ready.</p></section>}
    </div>
  );
}
