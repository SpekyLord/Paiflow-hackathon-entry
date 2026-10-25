'use client';

import Link from 'next/link';
import { useWalletSummary } from '@/client/controllers';
import type { WalletSummaryDTO } from '@/contracts/dto';
import { DashboardBadge } from '@/components/sme/DashboardBadge';
import {
  ErrorNotice, HashChip, Loading, PageHeader, TestnetChip, TestnetNote, VerificationBadge, Xlm, btnOutline, card, focusRing, formatPht,
} from '@/components/sme/evidence';

// S-13. Three separate panels, never summed. Unavailable balance is never shown as 0.
const ROLE_LABEL: Record<WalletSummaryDTO['plans'][number]['role'], string> = {
  owner: 'Owner', approver: 'Approver', signer: 'Signer', envelope_recipient: 'Envelope recipient',
};
const KIND_LABEL: Record<WalletSummaryDTO['history'][number]['kind'], string> = {
  budget_payment: 'Budget payment', envelope_payout: 'Envelope payout', deposit: 'Deposit', release: 'Release', refund: 'Refund',
};

export default function WalletPage() {
  const { data, loading, error, reload } = useWalletSummary();

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Wallet" title="Wallet">
        <div className="flex items-center gap-2"><TestnetChip /><button type="button" className={btnOutline} onClick={() => void reload()} disabled={loading}>Reload</button></div>
      </PageHeader>
      <p className="max-w-[600px] text-sm leading-6 text-[#5f7167]">Stellar assets and Stellar wallets only. The three panels below are separate and are never added together.</p>

      {loading && !data && <Loading label="Loading wallet…" />}
      {error && <ErrorNotice message={error.message} code={error.code} />}

      {data && (
        <>
          <section className={`${card} p-5`} aria-labelledby="bind-heading">
            <h2 id="bind-heading" className="text-sm font-semibold text-[#214638]">Verified wallet</h2>
            {data.binding ? (
              <div className="mt-2 space-y-1 text-sm">
                <p className="break-all font-mono text-xs">{data.binding.address}</p>
                <p className="text-xs text-[#52625a]">Verified {formatPht(data.binding.verifiedAt)}</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-[#52625a]">No wallet is bound yet. <Link href="/wallet/bind" className={`rounded font-semibold text-[#1f5a43] underline ${focusRing}`}>Bind your Freighter wallet</Link> to sign payments.</p>
            )}
            {data.binding && <p className="mt-2 text-xs"><Link href="/wallet/bind" className={`rounded text-[#1f5a43] underline ${focusRing}`}>Wallet binding details</Link></p>}
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <section className={`${card} p-5`} aria-labelledby="bal-heading">
              <h2 id="bal-heading" className="text-sm font-semibold text-[#214638]">1. Wallet balance</h2>
              <div className="mt-3" aria-live="polite">
                {data.balance.state === 'available' ? (
                  <>
                    <div className="text-2xl font-semibold"><Xlm stroops={data.balance.xlmStroops} /></div>
                    <p className="mt-1 text-[11px] text-[#6d7f75]">As of {formatPht(data.balance.asOf)}</p>
                  </>
                ) : (
                  <>
                    <div className="text-lg font-semibold text-[#52625a]">Unavailable</div>
                    <p className="mt-1 text-[11px] text-[#6d7f75]">The balance could not be read right now. This is not a zero balance.</p>
                  </>
                )}
              </div>
            </section>

            <section className={`${card} p-5`} aria-labelledby="plans-heading">
              <h2 id="plans-heading" className="text-sm font-semibold text-[#214638]">2. Payment status by plan</h2>
              {data.plans.length === 0 ? <p className="mt-3 text-sm text-[#5f7167]">No plans involve this wallet yet.</p> : (
                <ul className="mt-3 space-y-3">
                  {data.plans.map((p) => (
                    <li key={`${p.planId}-${p.role}`} className="text-sm">
                      <Link href={`/plans/${p.planId}`} className={`rounded font-semibold text-[#183b30] hover:underline ${focusRing}`}>{p.purpose}</Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs"><DashboardBadge state={p.dashboardState} /><span className="text-[#52625a]">Your role: {ROLE_LABEL[p.role]}</span></div>
                    </li>
                  ))}
                </ul>
              )}
              {data.escrow.length === 0 && <p className="mt-3 text-[11px] text-[#6d7f75]">No protected-payment deals.</p>}
            </section>

            <section className={`${card} p-5`} aria-labelledby="paid-heading">
              <h2 id="paid-heading" className="text-sm font-semibold text-[#214638]">3. Verified payouts</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-[#6d7f75]">Received (verified)</dt><dd><Xlm stroops={data.verifiedPayouts.receivedStroops || '0'} /></dd></div>
                <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-[#6d7f75]">Refunded (verified)</dt><dd><Xlm stroops={data.verifiedPayouts.refundedStroops || '0'} /></dd></div>
              </dl>
              <p className="mt-2 text-[11px] text-[#6d7f75]">Only payouts with verified evidence are counted.</p>
            </section>
          </div>

          <section className={`${card} overflow-hidden`} aria-labelledby="hist-heading">
            <h2 id="hist-heading" className="border-b border-[#edf0ec] px-5 py-4 text-sm font-semibold text-[#214638]">History</h2>
            {data.history.length === 0 ? <p className="px-5 py-8 text-center text-sm text-[#5f7167]">No transactions yet.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <caption className="sr-only">Transaction history</caption>
                  <thead className="bg-[#f8faf7] text-[10px] uppercase tracking-[0.13em] text-[#6d7f75]">
                    <tr><th scope="col" className="px-5 py-2.5">Kind</th><th scope="col" className="px-3">Amount</th><th scope="col" className="px-3">Transaction</th><th scope="col" className="px-3">Verification</th><th scope="col" className="px-3">Time</th></tr>
                  </thead>
                  <tbody>
                    {data.history.map((h) => (
                      <tr key={`${h.refId}-${h.stellarTxHash}`} className="border-t border-[#edf0ec] align-top">
                        <td className="px-5 py-3 font-medium">{KIND_LABEL[h.kind]}</td>
                        <td className="px-3 py-3"><Xlm stroops={h.amountStroops} /></td>
                        <td className="px-3 py-3"><HashChip value={h.stellarTxHash} kind="stellarTxHash" explorer /></td>
                        <td className="px-3 py-3"><VerificationBadge state={h.verification} /></td>
                        <td className="px-3 py-3 text-xs text-[#52625a]">{formatPht(h.at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
      <TestnetNote />
    </div>
  );
}
