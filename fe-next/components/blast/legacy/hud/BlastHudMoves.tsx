'use client';

import { cn } from '@/lib/utils';

export type MovesTension = 'calm' | 'tense' | 'critical';

export function movesTension(moves: number): MovesTension {
  if (moves <= 2) return 'critical';
  if (moves <= 3) return 'tense';
  return 'calm';
}

const FACE: Record<MovesTension, string> = {
  calm: 'bg-neo-cream text-neo-navy',
  tense: 'bg-neo-orange text-neo-black',
  critical: 'bg-neo-red text-neo-white',
};

/** The hero number: chunky moves key that heats up as moves run out. */
export function BlastHudMoves({
  movesRemaining,
  label,
}: {
  movesRemaining: number;
  label: string | undefined;
}) {
  const tension = movesTension(movesRemaining);
  return (
    <div
      data-testid="blast-hud-moves"
      data-tension={tension}
      aria-live="polite"
      aria-label={`${label ?? 'Moves'}: ${movesRemaining}`}
      className={cn(
        'blast-hud-key flex shrink-0 flex-col items-center justify-center rounded-neo border-3 border-neo-black',
        'h-[60px] w-[68px] tv:h-[88px] tv:w-[100px] transition-colors duration-200',
        FACE[tension],
      )}
    >
      <span
        key={tension === 'calm' ? 'calm' : movesRemaining}
        className={cn(
          'font-neo-display text-[34px] font-black leading-none tabular-nums tv:text-5xl',
          tension !== 'calm' && 'blast-moves-tick',
        )}
      >
        {movesRemaining}
      </span>
      <span className="mt-0.5 text-[9px] font-black uppercase leading-none tracking-[0.14em] opacity-80 tv:text-xs">
        {label}
      </span>
    </div>
  );
}
