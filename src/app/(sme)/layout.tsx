'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, LayoutDashboard, LogOut, ShieldCheck, WalletCards } from 'lucide-react';
import { SessionProvider, useSession } from '@/components/sme/session';
import { FixtureBanner, TestnetChip, focusRing } from '@/components/sme/evidence';

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, org, signOut } = useSession();
  const navigation = [
    { href: '/plans', label: 'Budget plans', icon: LayoutDashboard },
    { href: '/documents', label: 'Documents', icon: FileText },
    { href: '/wallet', label: 'Wallet', icon: WalletCards },
    ...(session.isOperator ? [{ href: '/operator', label: 'Operator', icon: ShieldCheck }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#f4f6f2] text-[#142c27] md:grid md:grid-cols-[248px_minmax(0,1fr)]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3">Skip to content</a>
      <aside className="flex flex-col border-b border-[#dce5de] bg-[#fbfcf9] px-5 py-5 md:min-h-screen md:border-b-0 md:border-r md:px-6 md:py-7">
        <Link href="/plans" className={`flex items-center gap-3 rounded-lg ${focusRing}`}>
          <span className="grid size-10 place-items-center rounded-xl bg-[#174b3d] text-sm font-bold tracking-tight text-white" aria-hidden>P.</span>
          <span>
            <span className="block text-[17px] font-semibold tracking-[-0.04em]">CYFER</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5f7167]">for SMEs</span>
          </span>
        </Link>

        <nav aria-label="Workspace" className="mt-6 flex gap-2 overflow-x-auto md:mt-9 md:flex-col">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link key={href} href={href} aria-current={active ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${focusRing} ${active ? 'bg-[#e8f0e9] text-[#174b3d]' : 'text-[#4b6256] hover:bg-[#f0f4f0]'}`}>
                <Icon size={17} strokeWidth={1.8} aria-hidden />{label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto hidden rounded-xl border border-[#e1e8e1] bg-white p-4 md:block">
          <TestnetChip />
          <p className="mt-2 text-xs leading-5 text-[#5f7167]">Stellar Testnet — simulation, no real money.</p>
        </div>
      </aside>
      <div className="min-w-0">
        <FixtureBanner />
        <header className="flex h-[62px] items-center justify-between gap-3 border-b border-[#e0e7e1] bg-[#fbfcf9] px-5 md:h-[72px] md:px-10">
          <div className="min-w-0 truncate text-xs text-[#5f7167]">
            <span className="font-semibold text-[#345348]">{org?.name ?? 'No organisation'}</span>
            {org && <span className="ml-2 rounded bg-[#eef3ee] px-1.5 py-0.5 text-[10px] uppercase tracking-wide">{org.role}</span>}
          </div>
          <div className="flex items-center gap-3">
            <TestnetChip />
            <span className="hidden text-xs text-[#4b6256] sm:inline">{session.displayName}</span>
            <button type="button" onClick={() => void signOut()} className={`inline-flex items-center gap-1.5 rounded-lg border border-[#dfe7df] px-3 py-1.5 text-xs font-medium text-[#3e5a4c] hover:bg-[#f4f7f3] ${focusRing}`}>
              <LogOut size={13} aria-hidden /> Sign out
            </button>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1180px] px-5 py-8 md:px-10 md:py-11">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function SmeLayout({ children }: { children: React.ReactNode }) {
  return <SessionProvider><Shell>{children}</Shell></SessionProvider>;
}
