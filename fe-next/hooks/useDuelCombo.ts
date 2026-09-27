'use client';

/**
 * useDuelCombo — duel combo DISPLAY state.
 *
 * The server is the only thing that counts a streak or pays a bonus
 * (backend/modules/duelCombo.ts). This hook takes the `comboStreak` /
 * `comboBonus` that ride on `duel:word-accepted` and turns them into a tier, a
 * meter fill and the stingers that sell them. It never derives points, so the
 * meter can never disagree with the score (Class 3: one owner per number).
 *
 * Sounds respect the app mute setting for free — `playSound` is a no-op when
 * SFX are muted or audio has not been unlocked.
 */

import { useState, useRef, useCallback } from 'react';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import {
  duelComboTier,
  duelComboMeterFill,
  isDuelComboTierUp,
  type DuelComboTier,
} from '@/lib/education/duelCombo';

export interface UseDuelComboReturn {
  streak: number;
  bonus: number;
  peakStreak: number;
  tier: DuelComboTier;
  fill: number;
  /** Feed the numbers from a `duel:word-accepted` payload. */
  registerAccepted: (comboStreak: number, comboBonus: number) => void;
  /** Feed the streak from a `duel:word-rejected` payload (normally 0). */
  registerRejected: (comboStreak: number) => void;
  reset: () => void;
}

export function useDuelCombo(): UseDuelComboReturn {
  const { playSound } = useSoundEffects();
  const [streak, setStreak] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [peakStreak, setPeakStreak] = useState(0);
  const previousStreak = useRef(0);

  const registerAccepted = useCallback(
    (comboStreak: number, comboBonus: number) => {
      const previous = previousStreak.current;
      previousStreak.current = comboStreak;

      setStreak(comboStreak);
      setBonus(comboBonus);
      setPeakStreak((best) => Math.max(best, comboStreak));

      if (isDuelComboTierUp(previous, comboStreak)) {
        const tier = duelComboTier(comboStreak);
        // Inferno and above get the bigger fire stinger; earlier tiers a chime.
        const isBigTier = tier.id === 'inferno' || tier.id === 'supernova';
        playSound(isBigTier ? 'streakFire' : 'comboMilestone', { volume: isBigTier ? 0.7 : 0.5 });
      }
    },
    [playSound]
  );

  const registerRejected = useCallback(
    (comboStreak: number) => {
      const hadChain = previousStreak.current >= 2;
      previousStreak.current = comboStreak;
      setStreak(comboStreak);
      setBonus(0);
      if (hadChain && comboStreak === 0) {
        playSound('comboBreak', { volume: 0.4 });
      }
    },
    [playSound]
  );

  const reset = useCallback(() => {
    previousStreak.current = 0;
    setStreak(0);
    setBonus(0);
    setPeakStreak(0);
  }, []);

  return {
    streak,
    bonus,
    peakStreak,
    tier: duelComboTier(streak),
    fill: duelComboMeterFill(streak),
    registerAccepted,
    registerRejected,
    reset,
  };
}
