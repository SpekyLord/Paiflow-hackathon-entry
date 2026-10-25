import Link from 'next/link';
import {
  ArrowRight,
  Blocks,
  CheckCircle2,
  FileText,
  ScrollText,
  Shield,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

const primaryActions = [
  {
    href: '/verify',
    title: 'Verify a document',
    description: 'Check if a document you received matches the official version.',
    button: 'Start with Verify',
    icon: CheckCircle2,
    accent: 'var(--ok-soft)',
    color: 'var(--ok)',
  },
  {
    href: '/documents',
    title: 'Find the official copy',
    description: 'Browse and download the city’s published documents.',
    button: 'Open Official Records',
    icon: FileText,
    accent: 'var(--ink-025)',
    color: 'var(--ink-700)',
  },
  {
    href: '/budget',
    title: 'Check the budget',
    description: 'See approved city spending by category.',
    button: 'Open Budget',
    icon: Wallet,
    accent: 'var(--info-soft)',
    color: 'var(--info)',
  },
];

const trustTools = [
  {
    href: '/audit',
    title: 'Activity Log',
    description: 'Every upload, approval, and publication, in order.',
    icon: ScrollText,
  },
  {
    href: '/blockchain',
    title: 'Blockchain',
    description: 'The technical ledger and network view.',
    icon: Blocks,
  },
];

export default function LandingPage() {
  return (
    <main id="main">
      <section className="hero">
        <div className="container-page">
          <div className="mx-auto max-w-[760px] text-center">
            <span className="hero-badge">
              <Shield size={13} />
              Public records for everyone
            </span>
            <h1>Public records, made checkable.</h1>
            <p className="lede mx-auto text-center" style={{ marginInline: 'auto' }}>
              Verify a document, browse official records, or see how the city spends its budget.
            </p>
            <div className="hero-cta justify-center">
              <Link href="/verify">
                <Button size="lg">
                  <CheckCircle2 size={17} />
                  Verify a Document
                </Button>
              </Link>
              <Link href="/documents">
                <Button variant="outline" size="lg">
                  <FileText size={16} />
                  Official Records
                </Button>
              </Link>
            </div>
            <div className="mt-5 text-sm text-[var(--text-inv-soft)]">
              Start with <strong className="text-white">Verify</strong>.
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-page">
          <div className="section-head mx-auto max-w-[720px] text-center">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              Start here
            </div>
            <h2>Where to start</h2>
          </div>

          <div className="grid grid-3">
            {primaryActions.map(({ href, title, description, button, icon: Icon, accent, color }) => (
              <div key={href} className="card p-6 text-center">
                <span
                  className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-[14px]"
                  style={{ background: accent, color }}
                >
                  <Icon size={22} />
                </span>
                <h3 className="font-serif text-2xl font-semibold text-[var(--ink-900)]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">{description}</p>
                <Link href={href} className="mt-5 inline-flex justify-center">
                  <Button variant="outline">
                    {button}
                    <ArrowRight size={14} />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="section-tight"
        style={{
          background: 'var(--ink-025)',
          borderTop: '1px solid var(--line)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div className="container-page">
          <div className="section-head mx-auto max-w-[720px] text-center" style={{ marginBottom: 'var(--s-6)' }}>
            <div className="eyebrow justify-center">
                <span className="eyebrow-dot" />
                Need public proof?
            </div>
            <h2>Transparency tools</h2>
            <p>The public record behind every document.</p>
            <Link href="/transparency" className="mt-4 inline-flex justify-center">
              <Button variant="outline">
                Open Transparency
                <ArrowRight size={14} />
              </Button>
            </Link>
          </div>

          <div className="grid grid-2">
            {trustTools.map(({ href, title, description, icon: Icon }) => (
              <div key={href} className="card p-6 text-center">
                <span className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-[12px] bg-[var(--card)] text-[var(--ink-700)]">
                  <Icon size={20} />
                </span>
                <h3 className="font-serif text-xl font-semibold text-[var(--ink-900)]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{description}</p>
                <Link href={href} className="mt-4 inline-flex justify-center">
                  <Button variant="outline" size="sm">
                    Open {title}
                    <ArrowRight size={14} />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
