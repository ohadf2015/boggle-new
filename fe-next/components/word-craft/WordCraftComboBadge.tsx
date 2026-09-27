'use client';

import { useEffect, useState } from 'react';

interface Props {
  /** Current player streak (consecutive scoring words). From game.state.streaks.player. */
  streak: number;
  t: (path: string, fallbackOrParams?: string | Record<string, string | number>) => string;
}

/** Streaks below this are not a "combo" — a single word shouldn't flash a badge. */
const COMBO_THRESHOLD = 2;
/** Streak at which the badge escalates to the rarer "unstoppable" tier — a
 * variable-reward payoff so the badge keeps surprising instead of going flat. */
const UNSTOPPABLE_THRESHOLD = 5;
/** How long the affirmation badge stays on screen before it fades out. */
const DISPLAY_MS = 2200;

/**
 * Transient "you're on fire" combo badge. `streaks.player` already exists in
 * game state but had no visual payoff — this gives back-to-back scoring words a
 * party-energy flourish without adding any board clutter (it auto-dismisses and
 * never blocks input). Mount it gated on !cosyMode && !prefersReducedMotion.
 */
export function WordCraftComboBadge({ streak, t }: Props) {
  const [shownFor, setShownFor] = useState<number | null>(null);

  useEffect(() => {
    if (streak < COMBO_THRESHOLD) {
      setShownFor(null);
      return;
    }
    // Re-pop on every increment by keying the visible streak to the latest value.
    setShownFor(streak);
    const handle = window.setTimeout(() => setShownFor(null), DISPLAY_MS);
    return () => window.clearTimeout(handle);
  }, [streak]);

  if (shownFor === null) return null;

  const isUnstoppable = shownFor >= UNSTOPPABLE_THRESHOLD;

  return (
    <div
      key={shownFor}
      role="status"
      aria-live="polite"
      className={`pointer-events-none absolute left-1/2 top-[88px] z-40 -translate-x-1/2 animate-neo-pop rounded-neo border-neo-thick border-black px-4 py-2 font-neo-display font-black uppercase tracking-wider text-neo-white shadow-hard-lg ${
        isUnstoppable ? 'bg-neo-orange scale-110' : 'bg-neo-pink'
      }`}
    >
      <span aria-hidden className="mr-1">{isUnstoppable ? '⚡' : '🔥'}</span>
      {shownFor}× {t('wordcraft.combo')}
    </div>
  );
}
