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
  const initial = (session.displayName.trim()[0] ?? 'C').toUpperCase();

  return (
    <div className="min-h-screen bg-[#d4d4d2] p-0 text-[#10261a] sm:p-5 lg:p-12">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3">Skip to content</a>
      <div className="mx-auto min-h-screen w-full max-w-[1280px] overflow-hidden bg-[#f3f3f2] sm:min-h-0 sm:rounded-[36px]">
        <FixtureBanner />
        <header className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 pb-2 pt-5 md:px-8 md:pt-6">
          <Link href="/plans" className={`flex min-w-0 items-center gap-3 rounded-full ${focusRing}`}>
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#134223] text-sm font-semibold text-[#b5ee71]" aria-hidden>{initial}</span>
            <span className="min-w-0">
              <span className="block truncate text-xl font-medium tracking-[-0.02em] md:text-2xl">Hello, {session.displayName}</span>
              <span className="block truncate text-[11px] text-[#6a7a6e]">
                {org?.name ?? 'No organisation'}{org && <span className="ml-1.5 uppercase tracking-wide">· {org.role}</span>}
              </span>
            </span>
          </Link>

          <nav aria-label="Workspace" className="order-last -mx-1 flex w-full gap-1 overflow-x-auto px-1 md:order-none md:mx-auto md:w-auto md:overflow-visible">
            {navigation.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link key={href} href={href} aria-current={active ? 'page' : undefined}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${focusRing} ${active ? 'bg-[#b5ee71] text-[#0f3a1c]' : 'text-[#7a877d] hover:bg-white hover:text-[#10261a]'}`}>
                  <Icon size={15} strokeWidth={1.8} aria-hidden />{label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <TestnetChip />
            <button type="button" onClick={() => void signOut()} className={`inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-xs font-medium text-[#134223] hover:bg-[#e9f5da] ${focusRing}`}>
              <LogOut size={14} aria-hidden /> Sign out
            </button>
          </div>
        </header>
        <main id="main" className="w-full px-5 pb-8 pt-4 md:px-8 md:pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function SmeLayout({ children }: { children: React.ReactNode }) {
  return <SessionProvider><Shell>{children}</Shell></SessionProvider>;
}
