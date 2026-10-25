'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BarChart3, Database, Loader2, ScrollText } from 'lucide-react';
import { BudgetChart } from '@/components/budget/BudgetChart';
import { BudgetTable } from '@/components/budget/BudgetTable';
import { PublicSOP } from '@/components/public/PublicSOP';
import { Button } from '@/components/ui/Button';

interface BudgetCategory {
  category: string;
  amount: number;
  percentage: number;
}

interface BudgetSummary {
  totalBudget: number;
  categories: BudgetCategory[];
  fiscalYear: number;
}

export default function BudgetPage() {
  const [data, setData] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBudget() {
      try {
        const res = await fetch('/api/budget?summary=true');
        const json = await res.json();

        if (json.success) {
          setData(json.data);
        }
      } catch (error) {
        console.error('Failed to fetch budget:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchBudget();
  }, []);

  const formatPhp = (value: number) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <main id="main" className="container-page" style={{ paddingBottom: 'var(--s-11)' }}>
      <div className="page-head">
        <div className="eyebrow">
          <span className="eyebrow-dot" />
          Approved public data
        </div>
        <h1>Where your taxes went this year</h1>
        <p className="lead">
          The approved city budget — by total, share, and category.
        </p>
      </div>

      {loading ? (
        <section className="section">
          <div className="flex items-center justify-center py-20">
            <Loader2 size={36} className="animate-spin text-[var(--text-mute)]" />
          </div>
        </section>
      ) : !data || data.categories.length === 0 ? (
        <section className="section">
          <div className="card p-10 text-center">
            <div className="font-serif text-2xl font-semibold text-[var(--ink-900)]">
              No budget data is available yet
            </div>
            <p className="mt-2 text-sm text-[var(--text-soft)]">
              Approved entries will appear here once published.
            </p>
          </div>
        </section>
      ) : (
        <>
          <section className="section-tight">
            <PublicSOP
              compact
              title="Reading the budget"
              purpose="See how the approved budget is divided."
              steps={[
                {
                  title: 'Look at the largest category',
                  description: "The biggest slice — that's where most money goes.",
                },
                {
                  title: 'Compare percentages',
                  description: 'Use the chart and table side by side.',
                },
                {
                  title: 'Review approved totals only',
                  description: 'Only published, approved entries appear here.',
                },
              ]}
              next="Need more detail? Open Activity Log or Official Records."
            />
          </section>

          <section className="section-tight">
            <div className="grid grid-4">
              <div className="stat">
                <span className="stat-label">Total budget</span>
                <span className="stat-value">{formatPhp(data.totalBudget)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Fiscal year</span>
                <span className="stat-value">{data.fiscalYear}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Categories</span>
                <span className="stat-value">{data.categories.length}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Data source</span>
                <span className="stat-value">CYFER</span>
                <span className="stat-delta">Published entries only</span>
              </div>
            </div>
          </section>

          <section className="section-tight">
            <div className="grid-asymmetric">
              <div className="card p-6">
                <div className="row-between">
                  <div>
                    <div className="eyebrow">
                      <BarChart3 size={12} />
                      Allocation snapshot
                    </div>
                    <h2 className="mt-2 font-serif text-2xl font-semibold text-[var(--ink-900)]">
                      Budget overview
                    </h2>
                  </div>
                </div>
                <div className="mt-4">
                  <BudgetChart categories={data.categories} />
                </div>
              </div>

              <div className="card p-0">
                <div className="border-b border-[var(--line)] px-6 py-5">
                  <div className="eyebrow">
                    <Database size={12} />
                    Category breakdown
                  </div>
                  <h2 className="mt-2 font-serif text-2xl font-semibold text-[var(--ink-900)]">
                    Line-item allocations
                  </h2>
                </div>
                <div className="px-6 py-5">
                  <BudgetTable categories={data.categories} total={data.totalBudget} />
                </div>
              </div>
            </div>
          </section>

          <section className="section-tight">
            <div className="card p-5" style={{ background: 'var(--ink-025)' }}>
              <div className="row-between gap-4">
                <div>
                  <div className="eyebrow">
                    <ScrollText size={12} />
                    Need more detail?
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
                    Trace these numbers in Activity Log or Official Records.
                  </p>
                </div>
                <div className="row">
                  <Link href="/audit">
                    <Button variant="outline" size="sm">Open Activity Log</Button>
                  </Link>
                  <Link href="/documents">
                    <Button variant="ghost" size="sm">Official Records</Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
