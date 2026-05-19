import { useState, useEffect, useRef } from 'react';
import { calculateComboChainWindow } from '@/shared/utils/comboUtils';
import { useIsSelecting } from '@/hooks/useSelectionStore';

const DANGER_THRESHOLD = 30; // 30% remaining = danger
const COMBO_UPDATE_THRESHOLD = 2; // Only update when change is >2%
// While the user is mid-drag, swap RAF for a 3Hz interval. RAF (60Hz) stole
// frame budget the grid drag needed — the combo arc only needs ~3Hz to read
// as "live" and the change-threshold drops most setStates anyway.
const SELECTING_TICK_MS = 333;

interface ComboTimerResult {
  comboTimeRemaining: number | null;
  comboDanger: boolean;
}

/**
 * Tracks combo timer visual feedback. RAF while idle, downshifts to a 3Hz
 * interval during active drag so the combo HUD stops competing with grid
 * rendering for the main thread.
 */
export function useComboTimer(comboLevel: number, lastWordTime: number | null): ComboTimerResult {
  const [comboTimeRemaining, setComboTimeRemaining] = useState<number | null>(null);
  const [comboDanger, setComboDanger] = useState(false);
  const comboTimerRafRef = useRef<number | null>(null);
  const comboTimerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastDisplayedComboTimeRef = useRef<number>(100);
  const lastWordTimeRef = useRef<number | null>(lastWordTime);
  const isSelecting = useIsSelecting();

  // Keep ref in sync
  useEffect(() => {
    lastWordTimeRef.current = lastWordTime;
  }, [lastWordTime]);

  useEffect(() => {
    const cancel = () => {
      if (comboTimerRafRef.current) {
        cancelAnimationFrame(comboTimerRafRef.current);
        comboTimerRafRef.current = null;
      }
      if (comboTimerIntervalRef.current) {
        clearInterval(comboTimerIntervalRef.current);
        comboTimerIntervalRef.current = null;
      }
    };
    cancel();

    if (comboLevel > 0 && lastWordTime !== null) {
      const comboWindow = calculateComboChainWindow(comboLevel);
      lastDisplayedComboTimeRef.current = 100;

      setComboTimeRemaining(100);
      setComboDanger(false);

      const tick = (): number => {
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
        return remaining;
      };

      if (isSelecting) {
        comboTimerIntervalRef.current = setInterval(() => {
          const remaining = tick();
          if (remaining === 0) cancel();
        }, SELECTING_TICK_MS);
      } else {
        const updateTimeRemaining = () => {
          const remaining = tick();
          if (remaining > 0) {
            comboTimerRafRef.current = requestAnimationFrame(updateTimeRemaining);
          }
        };
        comboTimerRafRef.current = requestAnimationFrame(updateTimeRemaining);
      }
    } else {
      setComboTimeRemaining(null);
      setComboDanger(false);
      lastDisplayedComboTimeRef.current = 100;
    }

    return cancel;
  }, [comboLevel, lastWordTime, isSelecting]);

  return { comboTimeRemaining, comboDanger };
}
