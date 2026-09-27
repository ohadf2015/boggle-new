'use client';

import { TrendingUp, TrendingDown, Minus, Hourglass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { BrainCheckAnalysis, BrainCheckVerdict as Verdict } from '@/shared/utils/brainCheck';

const VERDICT_STYLE: Record<Verdict, { Icon: typeof TrendingUp; bg: string }> = {
  improved: { Icon: TrendingUp, bg: 'bg-neo-lime' },
  stable: { Icon: Minus, bg: 'bg-neo-cyan' },
  declined: { Icon: TrendingDown, bg: 'bg-neo-orange' },
  'need-more': { Icon: Hourglass, bg: 'bg-neo-cream' },
};

/** Inline SVG sparkline — the first (warm-up) run is drawn hollow. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 120;
  const h = 32;
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const xy = values.map((v, i) => [(i / (values.length - 1)) * (w - 6) + 3, h - 3 - ((v - min) / span) * (h - 6)]);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-[120px] shrink-0" aria-hidden="true">
      <polyline points={xy.map(p => p.join(',')).join(' ')} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      {xy.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill={i === 0 ? 'none' : 'currentColor'} stroke="currentColor" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

interface Props {
  analysis: BrainCheckAnalysis;
  className?: string;
}

/**
 * Honest trend readout for one drill's Brain Checks. Never shows a verdict the
 * statistics don't support: fewer than 5 checks (or <7 days) = "keep going".
 */
export default function BrainCheckVerdict({ analysis, className }: Props) {
  const { t } = useLanguage();
  const { verdict, runsNeeded, daysNeeded, changePct, points, runs } = analysis;
  const { Icon, bg } = VERDICT_STYLE[verdict];

  let label: string;
  if (verdict !== 'need-more') label = t(`brain.check.verdict.${verdict}`);
  else if (runs === 1) label = t('brain.check.warmupDone');
  else if (runsNeeded > 0) label = t('brain.check.needMoreRuns', { n: runsNeeded });
  else label = t('brain.check.needMoreDays', { n: daysNeeded });

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className={cn('inline-flex items-center gap-1.5 rounded-neo border-2 border-neo-black px-2.5 py-1 text-neo-black shadow-hard-sm', bg)}>
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="text-xs font-black uppercase tracking-wide">{label}</span>
      </div>
      {verdict !== 'need-more' && changePct !== null && (
        <span className="text-sm font-black tabular-nums" dir="ltr">
          {changePct > 0 ? '+' : ''}{Math.round(changePct)}%
        </span>
      )}
      <span className="ms-auto text-current opacity-80">
        <Sparkline values={points.map(p => p.value)} />
      </span>
    </div>
  );
}
