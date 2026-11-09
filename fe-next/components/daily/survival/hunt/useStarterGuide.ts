'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Language, LetterGrid } from '@/types';
import { hasWordInMemoryCache, prewarmDictionary } from '@/hooks/useDictionaryCache';
import type { FeedbackType } from '../types';
import { findStarterWord } from './starterWord';
import type { HuntCell } from './huntStage';

type TFn = (key: string, params?: Record<string, string | number> | string) => string;

/** With no word found after this long, the player is shown one to trace. */
export const STUCK_AFTER_MS = 15000;
/** ...or sooner, after this many rejected swipes. */
export const STUCK_AFTER_MISSES = 2;

const MISSES: ReadonlySet<FeedbackType> = new Set<FeedbackType>(['not-in-dictionary', 'not-on-board', 'invalid-word', 'too-short']);

export interface StarterGuide {
  path: HuntCell[];
  prompt: string;
}

export interface UseStarterGuideInput {
  /** First games only. */
  enabled: boolean;
  grid: LetterGrid;
  language: Language;
  targetLength: number;
  foundWords: string[];
  feedbackSeq: number;
  feedbackType: FeedbackType | null;
  t: TFn;
}

/**
 * New players who quit Word Hunt had one thing in common: they never found a first word. When a
 * first-game player is stuck, light a real short word on the board and name it, the same glow the
 * lesson uses. It goes away for good once they find any word.
 */
export function useStarterGuide({
  enabled,
  grid,
  language,
  targetLength,
  foundWords,
  feedbackSeq,
  feedbackType,
  t,
}: UseStarterGuideInput): StarterGuide | null {
  const active = enabled && foundWords.length === 0;
  const [timedOut, setTimedOut] = useState(false);
  const [misses, setMisses] = useState(0);
  const [dictReady, setDictReady] = useState(0);
  const lastSeq = useRef(feedbackSeq);

  useEffect(() => {
    if (!active) return undefined;
    const id = window.setTimeout(() => setTimedOut(true), STUCK_AFTER_MS);
    return () => window.clearTimeout(id);
  }, [active]);

  useEffect(() => {
    if (feedbackSeq === lastSeq.current) return;
    lastSeq.current = feedbackSeq;
    if (feedbackType && MISSES.has(feedbackType)) setMisses((n) => n + 1);
  }, [feedbackSeq, feedbackType]);

  // The dictionary is the fallback when no curated word is on today's board.
  useEffect(() => {
    if (!enabled) return undefined;
    let live = true;
    void prewarmDictionary(language).then(() => {
      if (live) setDictReady((n) => n + 1);
    });
    return () => {
      live = false;
    };
  }, [enabled, language]);

  const stuck = active && (timedOut || misses >= STUCK_AFTER_MISSES);
  const foundKey = foundWords.join(',');

  const starter = useMemo(() => {
    if (!stuck) return null;
    return findStarterWord({
      grid,
      language,
      targetLength,
      exclude: foundKey ? foundKey.split(',') : [],
      isWord: (w) => hasWordInMemoryCache(w, language) === true,
    });
    // dictReady re-runs the search once the dictionary arrives.
  }, [stuck, grid, language, targetLength, foundKey, dictReady]); // eslint-disable-line react-hooks/exhaustive-deps

  return useMemo(
    () => (starter ? { path: starter.path, prompt: t('wordHunt.survival.tryWord', { word: starter.word }) } : null),
    [starter, t],
  );
}
