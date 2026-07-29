/**
 * useHuntTargetPicker
 *
 * Picks a hunt-mode target word once per level as soon as solvedWords
 * resolves. Includes a 10s safety timeout that marks the picker "done"
 * rather than synthesizing unsolvable garbage from raw grid letters.
 *
 * Extracted from AdventureGame.tsx.
 */

import { useEffect, useRef } from 'react';
import { pickHuntTarget } from '@/lib/adventure/huntMode';

interface UseHuntTargetPickerProps {
  archetype: string;
  solvedWords: Set<string> | null | undefined;
  setHuntTarget: (word: string) => void;
}

export function useHuntTargetPicker({ archetype, solvedWords, setHuntTarget }: UseHuntTargetPickerProps): void {
  const pickedRef = useRef(false);

  useEffect(() => {
    if (archetype !== 'hunt' || pickedRef.current || !solvedWords) return;
    const target = pickHuntTarget(solvedWords);
    if (target) {
      setHuntTarget(target);
      pickedRef.current = true;
    }
  }, [archetype, solvedWords, setHuntTarget]);

  useEffect(() => {
    if (archetype !== 'hunt' || pickedRef.current) return;
    const timeout = setTimeout(() => {
      if (pickedRef.current) return;
      pickedRef.current = true;
    }, 10000);
    return () => clearTimeout(timeout);
  }, [archetype]);
}
