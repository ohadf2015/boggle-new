'use client';

import React, { useMemo } from 'react';
import { Fingerprint } from 'lucide-react';
import type { WordObject } from './types';

type TFunction = (key: string, params?: Record<string, string | number>) => string;

interface UniqueWordsSectionProps {
  allPlayerWords: Record<string, WordObject[]>;
  currentUsername: string;
  t: TFunction;
}

/**
 * UniqueWordsSection — words only the current player found.
 *
 * Returns null in solo play (<2 players) or when the player has no uniques.
 * Sorted longest-first so high-value words surface at the top.
 */
const UniqueWordsSection: React.FC<UniqueWordsSectionProps> = ({
  allPlayerWords,
  currentUsername,
  t,
}) => {
  const uniqueWords = useMemo(() => {
    const playerNames = Object.keys(allPlayerWords);
    if (playerNames.length < 2) return null;

    const toValidSet = (words: WordObject[]): Set<string> => {
      const s = new Set<string>();
      words.forEach((w) => {
        if (w.validated && !w.isDuplicate) s.add(w.word.toLowerCase());
      });
      return s;
    };

    const mySet = toValidSet(allPlayerWords[currentUsername] || []);

    const otherUnion = new Set<string>();
    playerNames.forEach((name) => {
      if (name === currentUsername) return;
      toValidSet(allPlayerWords[name]).forEach((w) => otherUnion.add(w));
    });

    const uniques = Array.from(mySet)
      .filter((w) => !otherUnion.has(w))
      .sort((a, b) => b.length - a.length);

    return uniques.length > 0 ? uniques : null;
  }, [allPlayerWords, currentUsername]);

  if (!uniqueWords) return null;

  return (
    <div className="bg-neo-navy/60 border-2 border-neo-cyan/40 rounded-neo shadow-hard-sm p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Fingerprint className="w-4 h-4 text-neo-cyan shrink-0" />
        <h3 className="text-sm font-black text-neo-white uppercase tracking-wide">
          {t('results.uniqueWords.title')}
        </h3>
        <span className="ms-auto text-xs font-bold text-neo-cyan">
          {uniqueWords.length}
        </span>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {uniqueWords.map((word) => (
          <li
            key={word}
            className="px-2 py-0.5 rounded bg-neo-cyan/20 text-neo-cyan text-xs font-semibold border border-neo-cyan/30 lowercase"
          >
            {word}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UniqueWordsSection;
