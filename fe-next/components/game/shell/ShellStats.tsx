'use client';

import { memo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ShellPanel } from './ShellPanel';
import type { ShellAccent } from './GameShell';
import styles from './gameShell.module.css';

export interface ShellStat {
  id: string;
  label: string;
  value: ReactNode;
  /** Re-keys the value so every change replays the pop. */
  bumpKey?: string | number;
  tone?: 'accent' | 'plain' | 'warn';
}

interface ShellStatsProps {
  title: string;
  stats: readonly ShellStat[];
  accent?: ShellAccent;
  /** Optional progress bar under the tiles (0..1). */
  progress?: { label: string; value: number };
  children?: ReactNode;
}

const TONE = {
  accent: 'text-[var(--panel-accent,var(--shell-accent))]',
  plain: 'text-neo-cream',
  warn: 'text-neo-pink',
} as const;

function ShellStatsImpl({ title, stats, accent, progress, children }: ShellStatsProps) {
  return (
    <ShellPanel title={title} accent={accent} testId="shell-stats">
      <dl className="grid grid-cols-2 gap-2 px-3 pb-3">
        {stats.map((s) => (
          <div key={s.id} data-testid={`shell-stat-${s.id}`} className="flex min-w-0 flex-col gap-1 rounded-lg bg-black/25 px-3 py-2 tv:py-3">
            <dt className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-neo-cream/55 tv:text-base">{s.label}</dt>
            <dd dir="ltr" className={cn('font-neo-display text-2xl font-black tabular-nums leading-none tv:text-4xl', TONE[s.tone ?? 'plain'])}>
              <span key={s.bumpKey ?? String(s.value)} className={styles.countPop}>{s.value}</span>
            </dd>
          </div>
        ))}
      </dl>
      {progress && (
        <div className="px-3 pb-3" data-testid="shell-stats-progress">
          <div className="mb-1 flex items-baseline justify-between text-[10px] font-bold uppercase tracking-[0.14em] text-neo-cream/55 tv:text-base">
            <span>{progress.label}</span>
            <span dir="ltr" className="tabular-nums">{Math.round(Math.min(1, Math.max(0, progress.value)) * 100)}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full border-2 border-black bg-black/40">
            <div
              className={cn(styles.bar, 'h-full w-full bg-[var(--panel-accent,var(--shell-accent))]')}
              style={{ transform: `scaleX(${Math.min(1, Math.max(0, progress.value))})` }}
            />
          </div>
        </div>
      )}
      {children}
    </ShellPanel>
  );
}

export const ShellStats = memo(ShellStatsImpl);
ShellStats.displayName = 'ShellStats';
