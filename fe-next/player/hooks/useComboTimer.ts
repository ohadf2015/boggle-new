import { useState, useEffect, useRef } from 'react';
import { calculateComboChainWindow } from '@/shared/utils/comboUtils';

const DANGER_THRESHOLD = 30; // 30% remaining = danger
const COMBO_UPDATE_THRESHOLD = 2; // Only update when change is >2%

interface ComboTimerResult {
  comboTimeRemaining: number | null;
  comboDanger: boolean;
}

/**
 * Tracks combo timer visual feedback using RAF for smooth updates.
 * Only triggers state updates when change exceeds threshold (~10/sec vs 60/sec).
 */
export function useComboTimer(comboLevel: number, lastWordTime: number | null): ComboTimerResult {
  const [comboTimeRemaining, setComboTimeRemaining] = useState<number | null>(null);
  const [comboDanger, setComboDanger] = useState(false);
  const comboTimerRafRef = useRef<number | null>(null);
  const lastDisplayedComboTimeRef = useRef<number>(100);
  const lastWordTimeRef = useRef<number | null>(lastWordTime);

  // Keep ref in sync
  useEffect(() => {
    lastWordTimeRef.current = lastWordTime;
  }, [lastWordTime]);

  useEffect(() => {
    if (comboTimerRafRef.current) {
      cancelAnimationFrame(comboTimerRafRef.current);
      comboTimerRafRef.current = null;
    }

    if (comboLevel > 0 && lastWordTime !== null) {
      const comboWindow = calculateComboChainWindow(comboLevel);
      lastDisplayedComboTimeRef.current = 100;

      setComboTimeRemaining(100);
      setComboDanger(false);

      const updateTimeRemaining = () => {
        const now = Date.now();
        const elapsed = now - (lastWordTimeRef.current ?? now);
        const remaining = Math.max(0, 100 - (elapsed / comboWindow) * 100);

        const shouldUpdate = Math.abs(remaining - lastDisplayedComboTimeRef.current) > COMBO_UPDATE_THRESHOLD;

        if (shouldUpdate || remaining === 0) {
          lastDisplayedComboTimeRef.current = remaining;
          setComboTimeRemaining(remaining);

          const isNowDanger = remaining <= DANGER_THRESHOLD && remaining > 0;
          setComboDanger(isNowDanger);
        }

        if (remaining > 0) {
          comboTimerRafRef.current = requestAnimationFrame(updateTimeRemaining);
        }
      };

      comboTimerRafRef.current = requestAnimationFrame(updateTimeRemaining);
    } else {
      setComboTimeRemaining(null);
      setComboDanger(false);
      lastDisplayedComboTimeRef.current = 100;
    }

    return () => {
      if (comboTimerRafRef.current) {
        cancelAnimationFrame(comboTimerRafRef.current);
      }
    };
  }, [comboLevel, lastWordTime]);

  return { comboTimeRemaining, comboDanger };
}
