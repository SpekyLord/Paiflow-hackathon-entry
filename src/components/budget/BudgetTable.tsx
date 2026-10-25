import { formatCurrency } from '@/utils/formatters';

interface BudgetCategory {
  category: string;
  amount: number;
  percentage: number;
}

export function BudgetTable({
  categories,
  total,
}: {
  categories: BudgetCategory[];
  total: number;
}) {
  return (
    <div className="space-y-2">
      {[...categories].sort((a, b) => b.amount - a.amount).map((category) => (
        <div
          key={category.category}
          className="flex items-center justify-between border-b border-[var(--line)] py-3 last:border-0"
        >
          <span className="text-sm font-medium text-[var(--ink-900)]">{category.category}</span>
          <div className="text-right">
            <p className="text-sm font-semibold text-[var(--ink-900)]">
              {formatCurrency(category.amount)}
            </p>
            <p className="text-xs text-[var(--text-mute)]">{category.percentage.toFixed(1)}%</p>
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between border-t-2 border-[var(--ink-900)] pt-3">
        <span className="font-serif text-lg font-semibold text-[var(--ink-900)]">Total</span>
        <span className="font-serif text-lg font-semibold text-[var(--ink-900)]">
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
}
