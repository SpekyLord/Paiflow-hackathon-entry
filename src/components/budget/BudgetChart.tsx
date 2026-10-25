'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface BudgetCategory {
  category: string;
  amount: number;
  percentage: number;
}

const COLORS = ['#123a52', '#246079', '#3d7a93', '#1c5c8a', '#8a5a00', '#6d95a8', '#1f7a46', '#a11723'];

function formatPhp(value: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--card)] p-3 text-sm shadow-[var(--shadow-2)]">
      <p className="font-semibold text-[var(--ink-900)]">{data.category}</p>
      <p className="text-[var(--text-soft)]">{formatPhp(data.amount)}</p>
      <p className="font-medium text-[var(--ink-700)]">{data.percentage.toFixed(1)}%</p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomLegend({ payload }: any) {
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
      {payload?.map((entry: { color: string; value: string }, index: number) => (
        <div key={index} className="flex items-center gap-2 text-xs text-[var(--text-soft)]">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span>{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function BudgetChart({ categories }: { categories: BudgetCategory[] }) {
  return (
    <div style={{ height: 420, width: '100%', minWidth: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={categories}
            cx="50%"
            cy="42%"
            innerRadius={65}
            outerRadius={108}
            paddingAngle={2}
            dataKey="amount"
            nameKey="category"
            stroke="none"
          >
            {categories.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
