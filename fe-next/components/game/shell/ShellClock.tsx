'use client';

import { memo } from 'react';
import { Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatClock } from './formatClock';
import type { ShellT } from './ShellPanel';
import styles from './gameShell.module.css';

interface ShellClockProps {
  t: ShellT;
  remaining: number;
  total: number;
}

function ShellClockImpl({ t, remaining, total }: ShellClockProps) {
  const share = total > 0 ? Math.min(1, Math.max(0, remaining / total)) : 0;
  const urgent = remaining <= 10 && remaining > 0;
  return (
    <section
      data-testid="shell-clock"
      data-urgent={String(urgent)}
      className={cn(styles.panel, 'px-3.5 pb-3 pt-3.5 text-neo-cream', urgent && styles.clockUrgent)}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-neo-display text-xs font-bold uppercase tracking-[0.14em] text-neo-cream/70 tv:text-lg">
          <Timer className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
          {t('gameShell.time')}
        </span>
        <span
          data-testid="shell-clock-value"
          dir="ltr"
          className={cn(
            'font-neo-display text-4xl font-black tabular-nums leading-none tv:text-6xl',
            urgent ? cn('text-neo-pink', styles.clockTick) : 'text-neo-yellow',
          )}
        >
          {formatClock(remaining)}
        </span>
      </div>
      <div className="mt-2.5 h-3 overflow-hidden rounded-full border-2 border-black bg-black/40">
        <div
          data-testid="shell-clock-bar"
          className={cn(styles.bar, 'h-full w-full', urgent ? 'bg-neo-pink' : 'bg-neo-yellow')}
          style={{ transform: `scaleX(${share})` }}
        />
      </div>
    </section>
  );
}

export const ShellClock = memo(ShellClockImpl);
ShellClock.displayName = 'ShellClock';
