'use client';

import { memo } from 'react';
import { Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatClock } from '@/components/game/shell/formatClock';

interface HuntRoundClockProps {
  remaining: number;
  total: number;
  label: string;
}

/**
 * The round clock for a timed hunt (Quick Play). Sits in the life bar's slot:
 * a timed round has no life drain, so the clock is the thing that runs out.
 */
function HuntRoundClockImpl({ remaining, total, label }: HuntRoundClockProps) {
  const share = total > 0 ? Math.min(1, Math.max(0, remaining / total)) : 0;
  const urgent = remaining <= 10 && remaining > 0;
  return (
    <div
      data-testid="hunt-round-clock"
      data-urgent={String(urgent)}
      role="timer"
      aria-label={label}
      className="flex w-full items-center gap-2 py-1"
    >
      <Timer
        className={cn('h-4 w-4 shrink-0', urgent ? 'text-neo-pink' : 'text-neo-yellow')}
        strokeWidth={3}
        aria-hidden="true"
      />
      <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full border-2 border-black bg-black/40">
        <div
          data-testid="hunt-round-clock-bar"
          className={cn(
            'h-full w-full origin-left rtl:origin-right transition-transform duration-1000 ease-linear motion-reduce:transition-none',
            urgent ? 'bg-neo-pink' : 'bg-neo-yellow',
          )}
          style={{ transform: `scaleX(${share})` }}
        />
      </div>
      <span
        data-testid="hunt-round-clock-value"
        dir="ltr"
        className={cn(
          'shrink-0 font-neo-display text-base font-black tabular-nums leading-none',
          urgent ? 'text-neo-pink' : 'text-neo-yellow',
        )}
      >
        {formatClock(remaining)}
      </span>
    </div>
  );
}

export const HuntRoundClock = memo(HuntRoundClockImpl);
export default HuntRoundClock;
