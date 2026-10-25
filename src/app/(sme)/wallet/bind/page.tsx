'use client';

import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { useFreighter, useWalletBinding } from '@/client/controllers';
import { ErrorNotice, TestnetChip, TestnetNote, btnPrimary, focusRing, formatPht } from '@/components/sme/evidence';

// S-12. Binding proves control of the wallet by signing a server challenge; nothing is sent on chain.
export default function WalletBindPage() {
  const freighter = useFreighter();
  const wallet = useWalletBinding();
  const working = ['requesting_challenge', 'awaiting_signature', 'verifying'].includes(wallet.phase);

  return (
    <div className="mx-auto max-w-[640px] space-y-6">
      <Link href="/wallet" className={`inline-flex items-center gap-2 rounded text-xs font-medium text-[#5f7167] hover:text-[#245742] ${focusRing}`}><ArrowLeft size={14} aria-hidden /> Back to wallet</Link>
      <div>
        <div className="mb-2"><TestnetChip /></div>
        <h1 className="font-serif text-[34px] font-semibold tracking-[-0.04em] text-[#173b30]">Bind your wallet</h1>
        <p className="mt-2 text-sm leading-6 text-[#5f7167]">Sign a short message in Freighter to prove you control this Stellar Testnet account. No payment is made and nothing is sent to the network.</p>
      </div>

      <section className="space-y-4 rounded-xl border border-[#e2e9e2] bg-white p-6" aria-labelledby="fr-heading" aria-live="polite">
        <h2 id="fr-heading" className="text-sm font-semibold text-[#214638]">1. Freighter</h2>
        {freighter.status === 'checking' && <p className="flex items-center gap-2 text-sm"><Loader2 size={15} className="animate-spin" aria-hidden /> Looking for Freighter…</p>}
        {freighter.status === 'not_installed' && (
          <p className="text-sm">Freighter was not found. <a href="https://www.freighter.app" target="_blank" rel="noopener noreferrer" className={`rounded font-semibold text-[#1f5a43] underline ${focusRing}`}>Get Freighter at freighter.app</a>, then reload this page.</p>
        )}
        {freighter.status === 'not_connected' && (
          <button type="button" className={btnPrimary} onClick={() => void freighter.connect()}>Connect Freighter</button>
        )}
        {freighter.status === 'wrong_network' && <ErrorNotice message="Switch Freighter to Testnet, then refresh." code="FREIGHTER_WRONG_NETWORK" />}
        {freighter.status === 'connected' && freighter.address && (
          <p className="text-sm">Connected: <span className="break-all font-mono text-xs">{freighter.address}</span></p>
        )}
        {freighter.error && freighter.status !== 'wrong_network' && freighter.status !== 'not_installed' && <ErrorNotice message={freighter.error.message} code={freighter.error.code} />}
      </section>

      <section className="space-y-4 rounded-xl border border-[#e2e9e2] bg-white p-6" aria-labelledby="bind-heading" aria-live="polite">
        <h2 id="bind-heading" className="text-sm font-semibold text-[#214638]">2. Verified binding</h2>
        {wallet.binding ? (
          <div className="flex items-start gap-2 text-sm">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#1d5e3b]" aria-hidden />
            <div>
              <p className="font-semibold text-[#1d5e3b]">Verified</p>
              <p className="mt-1 break-all font-mono text-xs">{wallet.binding.address}</p>
              <p className="mt-1 text-xs text-[#52625a]">Verified {formatPht(wallet.binding.verifiedAt)}</p>
            </div>
          </div>
        ) : <p className="text-sm text-[#52625a]">No wallet is bound to your account yet.</p>}

        {wallet.freighterMatchesBinding === false && (
          <ErrorNotice message="Freighter is on a different account than your verified wallet. Switch accounts before signing." code="WALLET_MISMATCH" />
        )}

        {working && (
          <p className="flex items-center gap-2 text-sm">
            <Loader2 size={15} className="animate-spin" aria-hidden />
            {wallet.phase === 'requesting_challenge' && 'Requesting a challenge…'}
            {wallet.phase === 'awaiting_signature' && 'Waiting for your signature in Freighter…'}
            {wallet.phase === 'verifying' && 'Verifying the signature…'}
          </p>
        )}
        {wallet.phase === 'bound' && !wallet.binding && <p className="text-sm text-[#1d5e3b]">Bound.</p>}
        {wallet.error && <ErrorNotice message={wallet.error.message} code={wallet.error.code} />}

        {!wallet.binding && (
          <button type="button" className={btnPrimary} disabled={working || freighter.status !== 'connected'} onClick={() => void wallet.bind()}>
            Sign challenge in Freighter
          </button>
        )}
      </section>
      <TestnetNote />
    </div>
  );
}
