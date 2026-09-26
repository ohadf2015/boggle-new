'use client';

/**
 * The words the SERVER accepted for me this round (mpFeedback lastWord), with
 * its points. Modes that submit straight to the socket (blast) never fill the
 * view's `foundWords`, so the desktop FOUND panel reads this too — both paths
 * land in one list (pitfall class 3).
 */
import { useEffect, useState } from 'react';
import type { LadderWord } from '../desktop/WordsLadder';
import { useFreshLastWord } from './useServerFloaters';

export interface ServerAcceptedWord {
  word: string;
  points: number;
  ts: number;
}

export function useServerAcceptedWords(): readonly ServerAcceptedWord[] {
  const fresh = useFreshLastWord();
  const [words, setWords] = useState<readonly ServerAcceptedWord[]>([]);
  useEffect(() => {
    if (!fresh) return;
    setWords((prev) => [...prev, { word: fresh.word, points: fresh.points, ts: fresh.ts }]);
    // Keyed on the event id only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fresh?.id]);
  return words;
}

/** One ladder row per word (case-insensitive): server points win over an optimistic 0. */
export function mergeServerWords(
  ladder: readonly LadderWord[],
  accepted: readonly ServerAcceptedWord[],
  meId: string,
): LadderWord[] {
  if (accepted.length === 0) return ladder as LadderWord[];
  const byWord = new Map(ladder.map((w) => [w.word.toLowerCase(), w]));
  for (const a of accepted) {
    const key = a.word.toLowerCase();
    const have = byWord.get(key);
    byWord.set(key, have ? { ...have, score: a.points } : { word: a.word, score: a.points, ts: a.ts, userId: meId });
  }
  return [...byWord.values()];
}
