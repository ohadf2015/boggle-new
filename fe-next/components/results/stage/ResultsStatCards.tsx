'use client';

import type { ReactNode } from 'react';
import { useCountUp } from '@/lib/quickPlay/useCountUp';

export type ResultsTone = 'yellow' | 'cyan' | 'lime' | 'pink' | 'purple' | 'orange';

export const TONE_BAND: Record<ResultsTone, string> = {
  yellow: 'bg-neo-yellow',
  cyan: 'bg-neo-cyan',
  lime: 'bg-neo-lime',
  pink: 'bg-neo-pink',
  purple: 'bg-neo-purple',
  orange: 'bg-neo-orange',
};

export const TONE_INK: Record<ResultsTone, string> = {
  yellow: 'text-neo-yellow',
  cyan: 'text-neo-cyan',
  lime: 'text-neo-lime',
  pink: 'text-neo-pink',
  purple: 'text-neo-purple',
  orange: 'text-neo-orange',
};

export interface ResultsStatItem {
  key: string;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon?: ReactNode;
  tone?: ResultsTone;
  /** Explicit classes win over `tone` (quick play passes its mode colour). */
  band?: string;
  ink?: string;
  testId?: string;
  valueTestId?: string;
}

export const STAT_COUNT_MS = 650;
const FIRST_APPEAR_MS = 150;
const STAT_STEP_MS = 550;

/** Each card lands, counts, and only then does the next one arrive. */
export function statTiming(index: number) {
  const appear = FIRST_APPEAR_MS + index * STAT_STEP_MS;
  return { appear, count: appear + 150 };
}

function StatCard({ item, index, animate }: { item: ResultsStatItem; index: number; animate: boolean }) {
  const timing = statTiming(index);
  const shown = useCountUp(item.value, { delay: timing.count, duration: STAT_COUNT_MS, enabled: animate });
  const band = item.band ?? TONE_BAND[item.tone ?? 'yellow'];
  const ink = item.ink ?? TONE_INK[item.tone ?? 'yellow'];
  return (
    <div className="relative min-w-0">
      <span
        aria-hidden="true"
        data-testid="quick-stat-socket"
        className="absolute inset-0 rounded-2xl border-[3px] border-dashed border-neo-white/15 bg-black/20"
      />
      <div
        className={`relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border-[3px] border-black bg-neo-navy-elevated shadow-hard ${
          animate ? 'animate-[qp-card-in_0.42s_cubic-bezier(0.34,1.4,0.64,1)_both]' : ''
        }`}
        style={animate ? { animationDelay: `${timing.appear}ms` } : undefined}
        data-testid={item.testId ?? `results-stat-${item.key}`}
        data-delay={timing.count}
        data-value={item.value}
      >
        <span
          className={`truncate px-2 py-1 text-center font-neo-display text-[10px] font-bold uppercase tracking-[0.16em] text-black ${band}`}
        >
          {item.label}
        </span>
        <span className="flex items-center justify-center gap-1.5 px-2 py-2.5 lg:py-3.5">
          {item.icon && <span className={ink}>{item.icon}</span>}
          <b
            dir="ltr"
            className={`inline-block font-neo-display text-3xl leading-none tabular-nums lg:text-4xl ${ink} ${
              animate ? 'animate-[qp-value-pop_0.38s_cubic-bezier(0.34,1.56,0.64,1)_both]' : ''
            }`}
            style={animate ? { animationDelay: `${timing.count + STAT_COUNT_MS}ms` } : undefined}
            data-testid={item.valueTestId}
          >
            {item.prefix}
            {shown}
            {item.suffix}
          </b>
        </span>
      </div>
    </div>
  );
}

export function ResultsStatCards({
  items,
  animate,
  testId = 'results-stats',
}: {
  items: ResultsStatItem[];
  animate: boolean;
  testId?: string;
}) {
  if (items.length === 0) return null;
  const cols = items.length === 2 ? 'grid-cols-2' : items.length >= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3';
  return (
    <div className={`grid w-full ${cols} gap-2.5 lg:max-w-2xl lg:gap-5`} data-testid={testId}>
      {items.map((item, i) => (
        <StatCard key={item.key} item={item} index={i} animate={animate} />
      ))}
    </div>
  );
}
