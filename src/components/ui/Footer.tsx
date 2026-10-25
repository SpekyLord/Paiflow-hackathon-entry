import Image from 'next/image';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="foot">
      <div className="container-page">
        <div className="md:hidden">
          <div className="row" style={{ gap: 10 }}>
            <Image src="/Cyfer Logo.png" alt="CYFER" width={24} height={24} />
            <strong style={{ color: 'var(--ink-900)' }}>CYFER</strong>
          </div>

          <p className="mt-3 max-w-[34ch] text-sm leading-6">
            Public tools for checking records, finding official copies, and reviewing transparency data.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href="/verify" className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-center text-sm no-underline">
              Verify
            </Link>
            <Link href="/documents" className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-center text-sm no-underline">
              Records
            </Link>
            <Link href="/budget" className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-center text-sm no-underline">
              Budget
            </Link>
            <Link href="/transparency" className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-center text-sm no-underline">
              Transparency
            </Link>
          </div>

          <div className="row mt-4 justify-between text-xs">
            <Link href="/login">Official sign-in</Link>
            <span>SDG 16 public trust platform</span>
          </div>
        </div>

        <div className="hidden md:block">
          <div className="grid gap-[var(--s-6)] md:grid-cols-[1.25fr_0.9fr_0.9fr]">
            <div>
              <div className="row" style={{ gap: 10 }}>
                <Image src="/Cyfer Logo.png" alt="CYFER" width={26} height={26} />
                <strong style={{ color: 'var(--ink-900)' }}>CYFER</strong>
                <span className="muted">Sample City LGU - Fiscal Year 2026</span>
              </div>
              <p className="mt-3 max-w-[44ch] text-sm leading-6">
                Verify documents, find official records, and review approved budget
                data without needing a technical background.
              </p>
            </div>

            <div>
              <div className="eyebrow">Use CYFER</div>
              <div className="stack-2 mt-3">
                <Link href="/verify">Verify a Document</Link>
                <Link href="/documents">Official Records</Link>
                <Link href="/budget">Budget</Link>
                <Link href="/transparency">Transparency</Link>
              </div>
            </div>

            <div>
              <div className="eyebrow">Transparency Tools</div>
              <div className="stack-2 mt-3">
                <Link href="/transparency">Transparency hub</Link>
                <Link href="/audit">Activity Log</Link>
                <Link href="/blockchain">Blockchain</Link>
                <Link href="/login">Official sign-in</Link>
              </div>
            </div>
          </div>

          <div className="foot-row" style={{ marginTop: 'var(--s-7)' }}>
            <div>A public trust platform aligned with SDG 16 - Peace, Justice and Strong Institutions.</div>
            <div className="row" style={{ gap: 18, fontSize: 13 }}>
              <Link href="/verify">Start with Verify</Link>
              <Link href="/documents">Find Official Records</Link>
              <Link href="/transparency">See Transparency</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
