import { useCallback, useRef } from 'react';
import { useStuckCoach } from '@/hooks/useStuckCoach';

interface Args {
  active: boolean;
  grid: string[][];
  wordsFound: number;
  language: string;
}

/** The shared stuck-player coach, fed by the adventure board's gestures. */
export function useAdventureBoardCoach({ active, grid, wordsFound, language }: Args) {
  const coach = useStuckCoach({
    mode: 'adventure',
    active,
    sessionKey: grid.map((row) => row.join('')).join('|'),
    wordsFound,
    grid,
    language,
  });
  const { markActivity, markTap, markDragStart, markSubmit } = coach;
  const dragCounted = useRef(false);

  const onWordChange = useCallback((_word: string, count: number) => {
    if (count === 0) {
      dragCounted.current = false;
    } else if (count >= 2 && !dragCounted.current) {
      dragCounted.current = true;
      markDragStart();
    } else {
      markActivity();
    }
  }, [markActivity, markDragStart]);

  const onSingleTapDetected = useCallback((_cell: { row: number; col: number; letter: string }) => markTap(), [markTap]);

  return { coach, onWordChange, onSingleTapDetected, markSubmit };
}
