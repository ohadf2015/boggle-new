import { useEffect, useRef, useState } from 'react';

export interface UseBlastIntensityOptions {
  comboLevel: number;
  cascadeChainLevel: number;
  comboStreakLevel: number;
  isHotPhase: boolean;
  wordsFoundCount: number;
}

function calculateRawIntensity(options: UseBlastIntensityOptions): number {
  let intensity = 0;

  if (options.comboLevel >= 7) intensity += 3;
  else if (options.comboLevel >= 5) intensity += 2;
  else if (options.comboLevel >= 3) intensity += 1;

  if (options.cascadeChainLevel >= 3) intensity += 2;
  else if (options.cascadeChainLevel >= 1) intensity += 1;

  if (options.comboStreakLevel >= 3) intensity += 1;

  if (options.isHotPhase) intensity += 1;

  return Math.min(intensity, 5);
}

const DECAY_INTERVAL_MS = 2000;

export function useBlastIntensity(options: UseBlastIntensityOptions): number {
  const target = calculateRawIntensity(options);
  const [displayed, setDisplayed] = useState(target);
  const displayedRef = useRef(displayed);

  // When target rises, jump immediately
  useEffect(() => {
    if (target >= displayedRef.current) {
      displayedRef.current = target;
      setDisplayed(target);
    }
  }, [target]);

  // Decay when target is below displayed
  useEffect(() => {
    if (target >= displayedRef.current) return;

    const interval = setInterval(() => {
      const next = displayedRef.current - 1;
      displayedRef.current = next;
      setDisplayed(next);
      if (next <= target) clearInterval(interval);
    }, DECAY_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [target]);

  return displayed;
}
