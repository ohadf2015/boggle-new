import { useCallback, useRef, useState } from 'react';
import { COMBO_WINDOW_MS, comboMultiplier } from '@/utils/dailyChallenge/wordWheelScoring';
import type { useChannelTimers } from './useWheelFeedback';

// Days before the bonus rules keep the old display-only streak.
const LEGACY_COMBO_WINDOW_MS = 5000;

export interface ComboStep { chain: number; multiplier: number; tierUp: boolean }

/** Words landed in a row; on bonus days each step multiplies the word's points. */
export function useWheelCombo(bonuses: boolean, timers: ReturnType<typeof useChannelTimers>) {
  const [combo, setCombo] = useState(0);
  const [breakId, setBreakId] = useState(0);
  const chainRef = useRef(0);
  const lastAtRef = useRef(0);
  const windowMs = bonuses ? COMBO_WINDOW_MS : LEGACY_COMBO_WINDOW_MS;

  const register = useCallback((): ComboStep => {
    const now = Date.now();
    const live = chainRef.current > 0 && now - lastAtRef.current <= windowMs;
    const before = live ? chainRef.current : 0;
    const chain = before + 1;
    chainRef.current = chain;
    lastAtRef.current = now;
    setCombo(chain);
    timers.set('combo', () => { chainRef.current = 0; setCombo(0); }, windowMs);
    const multiplier = bonuses ? comboMultiplier(chain) : 1;
    return { chain, multiplier, tierUp: bonuses && multiplier > comboMultiplier(before) };
  }, [bonuses, timers, windowMs]);

  const breakCombo = useCallback(() => {
    if (!bonuses) return;
    if (chainRef.current >= 2) setBreakId(i => i + 1);
    chainRef.current = 0;
    setCombo(0);
    timers.clear('combo');
  }, [bonuses, timers]);

  return { combo, multiplier: bonuses ? comboMultiplier(combo) : null, breakId, register, breakCombo };
}
