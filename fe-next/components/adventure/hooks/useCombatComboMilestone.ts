/**
 * useCombatComboMilestone
 *
 * Watches comboCount and triggers checkMilestone only while the level is
 * actively being played. Always mirrors the latest combo into
 * prevComboCountRef so downstream word-submit logic can compare deltas.
 */

import { useEffect, type RefObject } from 'react';

interface UseCombatComboMilestoneProps {
  comboCount: number;
  isPlaying: boolean;
  entryPhase: string;
  isPaused: boolean;
  checkMilestone: (combo: number) => void;
  prevComboCountRef: RefObject<number>;
}

export function useCombatComboMilestone({
  comboCount, isPlaying, entryPhase, isPaused, checkMilestone, prevComboCountRef,
}: UseCombatComboMilestoneProps): void {
  useEffect(() => {
    if (isPlaying && entryPhase === 'playing' && !isPaused) {
      checkMilestone(comboCount);
    }
    prevComboCountRef.current = comboCount;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comboCount, isPlaying, entryPhase, isPaused, checkMilestone]);
}
