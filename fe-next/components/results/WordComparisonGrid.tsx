'use client';

import React, { useMemo } from 'react';
import { Crown, Fingerprint } from 'lucide-react';
import type { WordObject } from './types';

type TFunction = (key: string, params?: Record<string, string | number>) => string;

interface WordComparisonGridProps {
  /** Validated words per player (includes invalid/duplicate entries — filtered inside) */
  allPlayerWords: Record<string, WordObject[]>;
  /** Current player's username — their column gets highlighted */
  currentUsername: string;
  /** Translation function */
  t: TFunction;
}

interface AnalyzedWord {
  word: string;
  isUnique: boolean;
}

/**
 * WordComparisonGrid — per-player word drill-down focused on uniques.
 *
 * One column per player; the current player's column carries `data-current="true"`.
 * Words only one player found are tagged `data-unique="true"` (cyan highlight) —
 * the high-status, conversation-driving signal. Shared/baseline words render plain.
 * Words sort uniques first so the bragging-rights material reads at a glance.
 *
 * Returns null when there are fewer than 2 players (nothing to compare).
 */
const WordComparisonGrid: React.FC<WordComparisonGridProps> = ({
  allPlayerWords,
  currentUsername,
  t,
}) => {
  const analyzed = useMemo(() => {
    const playerNames = Object.keys(allPlayerWords);
    if (playerNames.length < 2) return null;

    // Build per-player normalized word sets (validated, non-duplicate only)
    const normalizedByPlayer = new Map<string, Map<string, WordObject>>();
    playerNames.forEach((name) => {
      const inner = new Map<string, WordObject>();
      (allPlayerWords[name] || []).forEach((w) => {
        if (!w.validated || w.isDuplicate) return;
        const key = w.word.toLowerCase();
        if (!inner.has(key)) inner.set(key, w);
      });
      normalizedByPlayer.set(name, inner);
    });

    // Count how many players found each word
    const playerCountByWord = new Map<string, number>();
    normalizedByPlayer.forEach((inner) => {
      inner.forEach((_w, key) => {
        playerCountByWord.set(key, (playerCountByWord.get(key) || 0) + 1);
      });
    });

    const columns = playerNames.map((name) => {
      const inner = normalizedByPlayer.get(name)!;
      const words: AnalyzedWord[] = Array.from(inner.entries())
        .map(([key, wobj]) => ({
          word: wobj.word,
          isUnique: (playerCountByWord.get(key) || 1) === 1,
        }))
        // Uniques first (bragging rights), then by length desc (longer = more impressive)
        .sort((a, b) => {
          if (a.isUnique !== b.isUnique) return a.isUnique ? -1 : 1;
          return b.word.length - a.word.length;
        });
      // Surface current player first so they read their own column instantly
      return { name, words, isCurrent: name === currentUsername };
    }).sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent));

    return columns;
  }, [allPlayerWords, currentUsername]);

  if (!analyzed) return null;

  return (
    <div className="bg-neo-navy/60 border-3 border-neo-black rounded-neo shadow-hard-sm p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-black text-neo-cream uppercase tracking-wide">
          {t('results.wordComparison.title')}
        </h3>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-neo-cyan">
          <Fingerprint className="w-3 h-3" />
          {t('results.wordComparison.unique')}
        </span>
      </div>

      {/* Mobile: stack columns full-width so current player reads top-down.
          ≥sm: side-by-side grid for at-a-glance comparison. */}
      <div
        className="grid gap-2 grid-cols-1 sm:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))]"
        style={{ '--cols': analyzed.length } as React.CSSProperties}
      >
        {analyzed.map(({ name, words, isCurrent }) => (
          <div
            key={name}
            data-testid={`word-comparison-column-${name}`}
            data-current={isCurrent ? 'true' : 'false'}
            className={`flex flex-col gap-1.5 p-2 rounded-neo border-2 ${
              isCurrent
                ? 'border-neo-cyan bg-neo-cyan/10'
                : 'border-neo-black/40 bg-neo-navy/40'
            }`}
          >
            <div className="flex items-center gap-1 pb-1 border-b border-neo-black/30">
              {isCurrent && <Crown className="w-3 h-3 text-neo-yellow" />}
              <span className="text-xs font-black text-neo-cream truncate">{name}</span>
              <span className="ms-auto text-[10px] font-bold text-neo-cream/60">
                {words.length}
              </span>
            </div>
            <ul className="flex flex-col gap-0.5 max-h-48 overflow-y-auto pe-1">
              {words.map((w) => (
                <li
                  key={w.word}
                  data-word={w.word}
                  data-unique={w.isUnique ? 'true' : 'false'}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold ${
                    w.isUnique
                      ? 'bg-neo-cyan/20 text-neo-cyan'
                      : 'text-neo-cream/85'
                  }`}
                >
                  {w.isUnique && <Fingerprint className="w-3 h-3 shrink-0" />}
                  <span className="truncate lowercase">{w.word}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WordComparisonGrid;
