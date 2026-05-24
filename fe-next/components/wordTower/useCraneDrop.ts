'use client';

import { useCallback, useRef, useState } from 'react';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useHaptics } from '@/hooks/useHaptics';
import type { HazardKind } from '@/lib/wordTower/hazards';
import {
  nextConsecutiveSloppy,
  nextPerfectStreak,
  perfectStreakBonus,
  type PlacementOutcome,
} from '@/lib/wordTower/cranePlacement';

/**
 * useCraneDrop — owns the Crane Stack drop reaction (extracted from
 * WordTowerPlay to keep it under the 500-line cap and to make the drop
 * decisions testable in isolation).
 *
 * Applies the cosy reward-amplifier model: drop quality scales the height
 * granted; a run of perfects earns escalating bonus height (the "just one more"
 * hook); a third bad drop in a row wobbles the just-placed floor off (reusing
 * the hazard pipeline, recoverable). Returns the live streak counts so the
 * crane overlay can compute the next drop's topple consistently.
 */
export function useCraneDrop(
  commit: (multiplier: number) => void,
  hazard: (floors: number, kind: HazardKind, ids: string[]) => void,
) {
  const sloppyRef = useRef(0);
  const perfectRef = useRef(0);
  const [streaks, setStreaks] = useState({ sloppy: 0, perfect: 0 });

  const { playPerfectWordSound, playWordAcceptedSound, playErrorSound } = useSoundEffects();
  const haptics = useHaptics();

  const onDrop = useCallback(
    (o: PlacementOutcome) => {
      perfectRef.current = nextPerfectStreak(perfectRef.current, o.quality);
      const multiplier =
        o.quality === 'perfect'
          ? o.heightMultiplier * (1 + perfectStreakBonus(perfectRef.current))
          : o.heightMultiplier;
      commit(multiplier);

      sloppyRef.current = o.topples ? 0 : nextConsecutiveSloppy(sloppyRef.current, o.quality);

      if (o.quality === 'perfect') { playPerfectWordSound(); haptics.levelComplete(); }
      else if (o.topples) { hazard(1, 'wobble', [`crane-wobble-${Date.now()}`]); }
      else if (o.quality === 'miss') { playErrorSound(); haptics.bossHit(); }
      else { playWordAcceptedSound(); haptics.selection(); }

      setStreaks({ sloppy: sloppyRef.current, perfect: perfectRef.current });
    },
    [commit, hazard, playPerfectWordSound, playWordAcceptedSound, playErrorSound, haptics],
  );

  return { onDrop, consecutiveSloppy: streaks.sloppy, perfectStreak: streaks.perfect };
}
