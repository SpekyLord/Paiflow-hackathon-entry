import Link from 'next/link';
import { Activity, FileText, LayoutDashboard, WalletCards } from 'lucide-react';

const navigation = [
  { href: '/plans', label: 'Budget plans', icon: LayoutDashboard, available: true },
  { href: '/wallet', label: 'Wallet', icon: WalletCards, available: false },
  { href: '/documents', label: 'Documents', icon: FileText, available: false },
];

export default function SmeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f6f2] text-[#142c27] md:grid md:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="flex flex-col border-b border-[#dce5de] bg-[#fbfcf9] px-5 py-5 md:min-h-screen md:border-b-0 md:border-r md:px-6 md:py-7">
        <Link href="/plans" className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#26715b]">
          <span className="grid size-10 place-items-center rounded-xl bg-[#174b3d] text-sm font-bold tracking-tight text-white">P.</span>
          <span>
            <span className="block text-[17px] font-semibold tracking-[-0.04em]">paiflow</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#71847b]">SME workspace</span>
          </span>
        </Link>

        <div className="mt-9 hidden px-3 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#8b9b92] md:block">Workspace</div>
        <nav aria-label="Workspace" className="mt-4 flex gap-2 overflow-x-auto md:flex-col">
          {navigation.map(({ href, label, icon: Icon, available }) => (
            available ? (
              <Link key={href} href={href} aria-current="page" className="flex shrink-0 items-center gap-3 rounded-lg bg-[#e8f0e9] px-3 py-2.5 text-[13px] font-medium text-[#174b3d] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#26715b]">
                <Icon size={17} strokeWidth={1.8} />{label}
              </Link>
            ) : (
              <span key={href} aria-disabled="true" title="Coming next" className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-[#a1aca5]">
                <Icon size={17} strokeWidth={1.8} />{label}<span className="ml-auto hidden text-[9px] uppercase tracking-wider md:block">Soon</span>
              </span>
            )
          ))}
        </nav>

        <div className="mt-auto hidden rounded-xl border border-[#e1e8e1] bg-white p-4 md:block">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[#526a5f]"><Activity size={14} /> Stellar Testnet</div>
          <p className="mt-2 text-xs leading-5 text-[#839188]">Demo workspace · sample data</p>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex h-[62px] items-center justify-between border-b border-[#e0e7e1] bg-[#fbfcf9] px-5 md:h-[72px] md:px-10">
          <div className="text-xs text-[#77877f]">Paiflow <span className="mx-2 text-[#c4cec6]">/</span> <span className="font-medium text-[#345348]">Budget plans</span></div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-[#e3e9e3] bg-white px-3 py-1.5 text-[11px] font-medium text-[#63756c] sm:inline-flex">Demo mode</span>
            <span className="grid size-8 place-items-center rounded-full bg-[#dce9df] text-xs font-semibold text-[#285941]">F</span>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1180px] px-5 py-8 md:px-10 md:py-11">
          {children}
        </main>
      </div>
    </div>
  );
}
