'use client';

import React, { useMemo } from 'react';
import { Crown, Fingerprint, Users } from 'lucide-react';
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
  score: number;
  isUnique: boolean;
  isShared: boolean;
}

/**
 * WordComparisonGrid — side-by-side drill-down of which words each player found.
 *
 * Renders one column per player, each with the player's valid non-duplicate words.
 * Every word is tagged:
 *   - `data-unique="true"` when only that one player found it
 *   - `data-shared="true"` when ALL players found it
 * The current player's column carries `data-current="true"` for styling emphasis.
 *
 * Returns null when there are fewer than 2 players (no comparison possible).
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

    const totalPlayers = playerNames.length;
    const columns = playerNames.map((name) => {
      const inner = normalizedByPlayer.get(name)!;
      const words: AnalyzedWord[] = Array.from(inner.entries())
        .map(([key, wobj]) => {
          const count = playerCountByWord.get(key) || 1;
          return {
            word: wobj.word,
            score: wobj.score,
            isUnique: count === 1,
            isShared: count === totalPlayers,
          };
        })
        // Sort: unique first, then shared, then by descending score
        .sort((a, b) => {
          if (a.isUnique !== b.isUnique) return a.isUnique ? -1 : 1;
          if (a.isShared !== b.isShared) return a.isShared ? -1 : 1;
          return b.score - a.score;
        });
      return { name, words };
    });

    return columns;
  }, [allPlayerWords]);

  if (!analyzed) return null;

  return (
    <div className="bg-neo-navy/60 border-3 border-neo-black rounded-neo shadow-hard-sm p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-neo-cyan" />
        <h3 className="text-sm font-black text-neo-cream uppercase tracking-wide">
          {t('results.wordComparison.title')}
        </h3>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-wide text-neo-cream/70">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-2 h-2 bg-neo-cyan rounded-full" />
          {t('results.wordComparison.unique')}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-2 h-2 bg-neo-lime rounded-full" />
          {t('results.wordComparison.shared')}
        </span>
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${analyzed.length}, minmax(0, 1fr))` }}
      >
        {analyzed.map(({ name, words }) => {
          const isCurrent = name === currentUsername;
          return (
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
              <ul className="flex flex-col gap-0.5 max-h-48 overflow-y-auto pr-1">
                {words.map((w) => (
                  <li
                    key={w.word}
                    data-word={w.word}
                    data-unique={w.isUnique ? 'true' : 'false'}
                    data-shared={w.isShared ? 'true' : 'false'}
                    className={`flex items-center justify-between gap-1 px-1.5 py-0.5 rounded text-xs font-semibold ${
                      w.isUnique
                        ? 'bg-neo-cyan/20 text-neo-cyan'
                        : w.isShared
                          ? 'bg-neo-lime/15 text-neo-lime'
                          : 'text-neo-cream/85'
                    }`}
                  >
                    <span className="flex items-center gap-1 truncate">
                      {w.isUnique && <Fingerprint className="w-3 h-3 shrink-0" />}
                      <span className="truncate lowercase">{w.word}</span>
                    </span>
                    <span className="shrink-0 text-[10px] tabular-nums opacity-70">
                      {w.score}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WordComparisonGrid;
