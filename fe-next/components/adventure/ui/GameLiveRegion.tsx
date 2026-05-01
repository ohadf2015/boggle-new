/**
 * GameLiveRegion — visually-hidden screen-reader announcer.
 *
 * A11y audit Critical-3 / Serious (audit 2026-05-01): screen-reader users
 * had no real-time signal when a word was found — only the score number
 * changed via aria-live, which read as a bare integer with no context.
 *
 * This component watches `wordsFound` for new entries and announces
 * "WORD found, +X points" via a polite live region. Score changes alone
 * are still announced by the GameHeader's aria-live; this adds context.
 */

'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface GameLiveRegionProps {
  wordsFound: string[];
  score: number;
}

export const GameLiveRegion = memo(function GameLiveRegion({
  wordsFound,
  score,
}: GameLiveRegionProps) {
  const { t } = useLanguage();
  const prevWordCountRef = useRef(wordsFound.length);
  const prevScoreRef = useRef(score);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (wordsFound.length > prevWordCountRef.current) {
      const newest = wordsFound[wordsFound.length - 1];
      const delta = score - prevScoreRef.current;
      setMessage(t('adventure.live.wordFound', { word: newest, points: delta }));
    }
    prevWordCountRef.current = wordsFound.length;
    prevScoreRef.current = score;
  }, [wordsFound, score, t]);

  return (
    <div
      data-testid="game-live-region"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      // sr-only without breaking on Tailwind config — explicit visually-hidden styles.
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {message}
    </div>
  );
});

GameLiveRegion.displayName = 'GameLiveRegion';
