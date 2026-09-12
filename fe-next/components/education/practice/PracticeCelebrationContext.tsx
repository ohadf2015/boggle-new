'use client';

/**
 * PracticeCelebrationContext — where a level-up goes when a round has just ended.
 *
 * A level-up used to open `LevelUpCelebration`, a full-screen modal, the instant
 * the XP endpoint answered. That answer arrives a beat AFTER the completion card
 * mounts, so the modal landed on top of the card a student had just earned and
 * hid the stars, the XP chip and the one button on the screen (pitfalls Class 1:
 * two sources of "what is the payoff", the later one covering the earlier).
 *
 * The session now hands the level-up down here instead. Whichever surface is on
 * screen claims it: the completion card folds it in as a banner and calls
 * `acknowledge()`, which clears the session's copy so the modal never opens
 * behind it. When no round is finishing — a level-up earned on the picker, say —
 * nothing claims it and the modal still does its job.
 *
 * Deliberately tiny and prop-free at the call sites: eight practice screens
 * render the completion card themselves, and threading a level-up prop through
 * all of them would put a celebration concern into every drill.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { LevelUpPayload } from '@/components/education/LevelUpCelebration';

export interface PracticeCelebrationValue {
  /** The level-up waiting to be shown, or null. */
  levelUp: LevelUpPayload | null;
  /** Called by whichever surface showed it, so nothing shows it twice. */
  acknowledge: () => void;
}

const EMPTY: PracticeCelebrationValue = { levelUp: null, acknowledge: () => {} };

const PracticeCelebrationContext = createContext<PracticeCelebrationValue>(EMPTY);

export function PracticeCelebrationProvider({
  levelUp,
  onAcknowledge,
  children,
}: {
  levelUp: LevelUpPayload | null;
  onAcknowledge: () => void;
  children: ReactNode;
}) {
  const value = useMemo<PracticeCelebrationValue>(
    () => ({ levelUp: levelUp ?? null, acknowledge: onAcknowledge }),
    [levelUp, onAcknowledge]
  );
  return (
    <PracticeCelebrationContext.Provider value={value}>
      {children}
    </PracticeCelebrationContext.Provider>
  );
}

/** Safe outside a provider: every practice screen can call it unconditionally. */
export function usePracticeCelebration(): PracticeCelebrationValue {
  return useContext(PracticeCelebrationContext);
}
