import { CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import type { DashboardState } from '@/contracts/states';
import { DASHBOARD_LABEL } from '@/contracts/state-copy';

const TONE: Record<DashboardState, { tone: string; Icon: typeof Clock }> = {
  planned: { tone: 'bg-[#fff2d9] text-[#7a4f0d]', Icon: Clock },
  approved: { tone: 'bg-[#e8f2e9] text-[#2c6a45]', Icon: CheckCircle2 },
  pending: { tone: 'bg-[#e9eff8] text-[#35557d]', Icon: Clock },
  verified_distribution: { tone: 'bg-[#e1f1e6] text-[#1d5e3b]', Icon: CheckCircle2 },
  needs_review: { tone: 'bg-[#fce9e6] text-[#8f3326]', Icon: ShieldAlert },
  closed: { tone: 'bg-[#f0f2ef] text-[#52625a]', Icon: Clock },
};

/** Icon plus text, never colour alone. Labels come from state-copy.ts. */
export function DashboardBadge({ state }: { state: DashboardState }) {
  const { tone, Icon } = TONE[state];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>
      <Icon size={12} aria-hidden /> {DASHBOARD_LABEL[state]}
    </span>
  );
}
