'use client';

import { cn } from '@/lib/utils';
import { useClearPulse } from './useHudCounters';

interface BlastHudClearMeterProps {
  tilesCleared: number;
  totalTiles: number;
  /** Solo pass bar: the meter then ends at the pass line instead of the full board. */
  passPct?: number;
  goalMet: boolean;
  accent?: string;
  clearedLabel: string | undefined;
  /** `strip` = compact column for the MP round frame; `card` = the solo goal card's bar + count. */
  layout: 'strip' | 'card';
}

/** Fewest tiles whose rounded clear % meets the pass bar, matching the wave-end check. */
function tilesNeededToPass(totalTiles: number, passPct: number): number {
  for (let k = 1; k < totalTiles; k++) if (Math.round((k / totalTiles) * 100) >= passPct) return k;
  return Math.max(1, totalTiles);
}

function Bar({ pct, goalMet, pulse, accent, thick }: { pct: number; goalMet: boolean; pulse: boolean; accent?: string; thick: boolean }) {
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-full border-2 border-neo-black bg-neo-black/40 transition-transform duration-200',
        thick ? 'h-3.5 tv:h-5' : 'h-2.5',
        pulse && 'scale-y-125',
      )}
    >
      <div
        data-testid="blast-progress-fill"
        data-goal-met={goalMet ? 'true' : 'false'}
        className={cn(
          'blast-meter-fill h-full rounded-full transition-[width] duration-300',
          goalMet && 'blast-progress-shimmer',
          pulse && 'brightness-125',
        )}
        style={{ width: `${pct}%`, background: goalMet ? 'var(--neo-lime)' : (accent ?? 'var(--neo-cyan)') }}
      />
    </div>
  );
}

export function BlastHudClearMeter({ tilesCleared, totalTiles, passPct, goalMet, accent, clearedLabel, layout }: BlastHudClearMeterProps) {
  const { pulse, delta, burstKey } = useClearPulse(tilesCleared);
  const needed = passPct ? tilesNeededToPass(totalTiles, passPct) : totalTiles;
  const pct = needed > 0 ? Math.min(100, Math.round((tilesCleared / needed) * 100)) : 0;

  const deltaPop = pulse && delta > 0 && (
    <span
      key={burstKey}
      data-testid="blast-clear-delta"
      aria-hidden="true"
      className="blast-clear-delta-pop pointer-events-none absolute end-1 -top-1 text-sm font-black text-neo-lime"
    >
      +{delta}
    </span>
  );
  const readyMark = (
    <span data-testid="blast-progress-label" aria-hidden="true" className="h-3.5 text-sm font-black leading-none text-neo-lime">
      {goalMet ? '✓' : ' '}
    </span>
  );
  const count = (
    <span
      className={cn(
        'shrink-0 font-black uppercase tabular-nums transition-transform duration-150',
        layout === 'card' ? 'text-xs tracking-wide tv:text-base' : 'text-[9px] tracking-wider origin-[100%_50%] rtl:origin-[0%_50%]',
        goalMet ? 'text-neo-lime' : 'text-neo-white',
        pulse && 'scale-110 text-neo-lime',
      )}
    >
      {Math.min(tilesCleared, needed)}/{needed}{layout === 'strip' ? ` ${clearedLabel ?? ''}` : ''}
    </span>
  );

  if (layout === 'strip') {
    return (
      <div className="relative flex basis-1/3 min-w-0 flex-col items-end gap-0.5">
        {deltaPop}
        {readyMark}
        <Bar pct={pct} goalMet={goalMet} pulse={pulse} accent={accent} thick={false} />
        {count}
      </div>
    );
  }

  return (
    <div className="relative flex min-w-0 items-center gap-2">
      {deltaPop}
      <Bar pct={pct} goalMet={goalMet} pulse={pulse} accent={accent} thick />
      {count}
      {readyMark}
    </div>
  );
}
