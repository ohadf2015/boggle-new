/**
 * useEndlessMode Hook
 *
 * Manages endless mode — procedurally generated floors with escalating difficulty.
 * Tracks current floor, generates level configs, and records high floors.
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { generateEndlessFloor, getEndlessDifficulty, type EndlessDifficulty } from '@/lib/adventure/endlessMode';

export interface UseEndlessModeReturn {
  /** Current floor number (1-based) */
  currentFloor: number;
  /** Generated level config for current floor */
  levelConfig: ReturnType<typeof generateEndlessFloor>;
  /** Difficulty parameters for current floor */
  difficulty: EndlessDifficulty;
  /** Whether endless mode is active */
  isActive: boolean;
  /** Start endless mode from floor 1 */
  start: () => void;
  /** Advance to next floor (after victory) */
  advanceFloor: () => void;
  /** End the run (defeat or quit) */
  endRun: () => void;
  /** Highest floor reached this session */
  highFloor: number;
}

interface UseEndlessModeProps {
  /** Persisted high floor from player progression */
  initialHighFloor?: number;
  /** Callback when high floor is beaten */
  onNewHighFloor?: (floor: number) => void;
}

export function useEndlessMode({
  initialHighFloor = 0,
  onNewHighFloor,
}: UseEndlessModeProps = {}): UseEndlessModeReturn {
  const [currentFloor, setCurrentFloor] = useState(1);
  const [isActive, setIsActive] = useState(false);
  const [highFloor, setHighFloor] = useState(initialHighFloor);

  const levelConfig = useMemo(() => generateEndlessFloor(currentFloor), [currentFloor]);
  const difficulty = useMemo(() => getEndlessDifficulty(currentFloor), [currentFloor]);

  const start = useCallback(() => {
    setCurrentFloor(1);
    setIsActive(true);
  }, []);

  const advanceFloor = useCallback(() => {
    setCurrentFloor(prev => {
      const next = prev + 1;
      if (next > highFloor) {
        setHighFloor(next);
        onNewHighFloor?.(next);
      }
      return next;
    });
  }, [highFloor, onNewHighFloor]);

  const endRun = useCallback(() => {
    setIsActive(false);
  }, []);

  return { currentFloor, levelConfig, difficulty, isActive, start, advanceFloor, endRun, highFloor };
}
