'use client';

import { useEffect, useState } from 'react';
import type { DailyMutator } from '@/lib/wordTower/dailyMutators';

interface Props {
  /** The day's active mutator, or null in endless mode (renders nothing). */
  mutator: DailyMutator | null;
  t: (key: string, params?: Record<string, string | number>) => string;
  reducedMotion?: boolean;
}

/** How long the intro card holds before fading (ms). The persistent chip keeps
 *  the twist visible afterwards, so the big card can clear quickly. */
const INTRO_MS = 3000;

/**
 * WordTowerMutatorBanner — pops the day's shared twist once on entry, then
 * auto-hides (the persistent chip keeps it visible afterwards). Big, lime, and
 * centred so the player reads the rules of THIS day's tower before climbing.
 */
export function WordTowerMutatorBanner({ mutator, t, reducedMotion }: Props) {
  const [shown, setShown] = useState(true);
  // Re-show + restart the timer whenever the active mutator changes.
  useEffect(() => {
    if (!mutator) return;
    setShown(true);
    const id = setTimeout(() => setShown(false), INTRO_MS);
    return () => clearTimeout(id);
  }, [mutator?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mutator || !shown) return null;

  const descParams =
    mutator.id === 'goldenLetter' ? { letter: mutator.goldenLetter ?? '' } : undefined;

  return (
    <div
      className={`pointer-events-none absolute left-1/2 top-[30%] z-40 w-[min(86vw,360px)] -translate-x-1/2 rounded-neo border-neo-thick border-black bg-neo-lime px-4 py-3 text-center shadow-hard ${reducedMotion ? '' : 'animate-neo-pop'}`}
      role="status"
      aria-live="polite"
    >
      <div className="font-neo-body text-[10px] font-bold uppercase tracking-[0.22em] text-black/60">
        {t('wordTower.mutator.todaysTwist')}
      </div>
      <div className="mt-0.5 flex items-center justify-center gap-2 font-neo-display text-xl font-black uppercase tracking-wide text-black">
        <span aria-hidden className="text-2xl">{mutator.icon}</span>
        {t(mutator.nameKey)}
      </div>
      <div className="mt-1 font-neo-body text-sm font-semibold text-black/80">
        {t(mutator.descKey, descParams)}
      </div>
    </div>
  );
}
