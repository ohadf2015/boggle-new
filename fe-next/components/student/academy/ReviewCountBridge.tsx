'use client';

import { useEffect } from 'react';
import { useSpacedRepetition } from '@/hooks/useSpacedRepetition';

/** Mounted only with a real lesson id: the review API answers 400 to an empty one. */
export function ReviewCountBridge({ lessonId, words, onCount }: { lessonId: string; words: string[]; onCount: (n: number) => void }) {
  const { wordsForToday } = useSpacedRepetition(words, lessonId);
  const count = wordsForToday.length;
  useEffect(() => { onCount(count); }, [count, onCount]);
  useEffect(() => () => onCount(0), [onCount]);
  return null;
}
