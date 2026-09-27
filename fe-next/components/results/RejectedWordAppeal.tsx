'use client';

/**
 * RejectedWordAppeal
 *
 * Shows the words this round's dictionary refused and lets the player appeal them.
 *
 * Multiplayer already had this (WordPointsGroup → /api/appeal-word). Daily, solo
 * and adventure did not, even though all of them already funnel rejections through
 * `utils/invalidWordTracker`. "My real word was rejected and I can't argue" is the
 * single loudest complaint across EN and RU word-game reviews — see
 * docs/2026-08-02-word-game-player-complaints-research.md.
 */

import React, { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { getRejectedWords } from '@/utils/invalidWordTracker';
import type { Language } from '@/types';

/** /api/appeal-word 400s below this — don't render a button that can only fail. */
const MIN_APPEALABLE_LENGTH = 3;

export interface RejectedWordAppealProps {
  language: Language;
  t: (key: string) => string;
  className?: string;
}

export const RejectedWordAppeal: React.FC<RejectedWordAppealProps> = ({ language, t, className }) => {
  // Read once on mount: the results screen can re-render (and double-mount), and the
  // tracker is only reset at the next round's start, so this stays stable. The tracker
  // already dedupes per (word, language) on record, so no second pass is needed here.
  const [words] = useState(() =>
    getRejectedWords()
      .filter((r) => r.language === language && r.word.trim().length >= MIN_APPEALABLE_LENGTH)
      .map((r) => r.word)
  );
  const [appealed, setAppealed] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<string | null>(null);

  const handleAppeal = useCallback(async (word: string) => {
    if (appealed.has(word)) return;
    setPending(word);
    try {
      await fetch('/api/appeal-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, language }),
      });
      setAppealed((prev) => new Set(prev).add(word));
    } catch {
      // Silent fail — an unreachable appeal endpoint must never break results.
    } finally {
      setPending(null);
    }
  }, [appealed, language]);

  if (words.length === 0) return null;

  return (
    <div
      className={cn(
        'mx-auto max-w-sm rounded-neo border-neo-thick border-neo-black bg-neo-navy-light p-3 shadow-hard-sm',
        className
      )}
    >
      <p className="mb-2 text-xs font-bold font-neo-body text-neo-cream/80">
        {t('results.appealExplanation')}
      </p>
      <ul className="flex flex-wrap gap-2">
        {words.map((word) => {
          const isAppealed = appealed.has(word);
          return (
            <li key={word}>
              <button
                type="button"
                disabled={isAppealed || pending === word}
                onClick={() => handleAppeal(word)}
                aria-label={`${t('results.appealWord')} ${word}`}
                className={cn(
                  'flex items-center gap-1.5 rounded-neo border-neo border-neo-black px-2 py-1',
                  'font-neo-display text-xs font-black shadow-hard-sm',
                  'disabled:opacity-70',
                  isAppealed ? 'bg-neo-lime text-neo-black' : 'bg-neo-cream text-neo-black active:animate-neo-press'
                )}
              >
                <span className="uppercase tracking-wide">{word.toUpperCase()}</span>
                <span className="font-neo-body font-bold opacity-70">
                  {isAppealed ? t('results.appealed') : t('results.appealWord')}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default RejectedWordAppeal;
