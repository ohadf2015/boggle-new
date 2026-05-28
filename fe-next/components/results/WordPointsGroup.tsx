'use client';

/**
 * WordPointsGroup - Reusable component for displaying words grouped by point value
 *
 * Consolidates duplicated word grouping patterns from:
 * - ResultsPlayerCard.tsx (lines 461-496)
 * - SinglePlayerResults.tsx (lines 502-553)
 *
 * Supports two rendering modes:
 * - 'chip': Uses WordChip component (multiplayer results)
 * - 'simple': Uses simple styled spans (singleplayer results)
 */

import { memo, useMemo, useState, useCallback } from 'react';
import { m } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getPointColor, getTextColor } from './utils';
import { WordChip } from './WordChip';
import type { WordObject } from './types';

export interface WordPointsGroupProps {
  /** Words grouped by point value */
  wordsByPoints: Record<number, WordObject[]>;
  /** Sorted array of point values (descending) */
  sortedPointGroups: number[];
  /** Translation function */
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Function to get player count for a word (for multiplayer) */
  getPlayerCountForWord?: (word: string) => number;
  /** Rendering mode: 'chip' for WordChip, 'simple' for inline spans */
  mode?: 'chip' | 'simple';
  /** Additional className for container */
  className?: string;
  /** Whether to animate word entries (simple mode only) */
  animate?: boolean;
}

/**
 * Points badge component showing the point value
 */
const PointsBadge = memo<{
  points: number;
  wordCount: number;
  t: (key: string) => string;
}>(({ points, wordCount, t }) => (
  <div className="text-xs font-black mb-1 flex items-center gap-1.5 text-neo-black dark:text-neo-white uppercase">
    <span
      className="px-2 py-0.5 rounded-neo flex items-center justify-center font-black text-xs border-2 border-neo-black"
      style={{
        backgroundColor: getPointColor(points),
        color: getTextColor(points)
      }}
    >
      {points} {t('results.points')}
    </span>
    <span>{wordCount} {t('hostView.words')}</span>
  </div>
));

PointsBadge.displayName = 'PointsBadge';

/**
 * Simple word span for singleplayer results
 */
const SimpleWordSpan = memo<{
  wordObj: WordObject;
  index: number;
  animate: boolean;
}>(({ wordObj, index, animate }) => {
  const content = (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 text-sm font-black uppercase border-2 border-neo-black rounded-neo shadow-hard-sm"
      style={{
        backgroundColor: getPointColor(wordObj.score),
        color: getTextColor(wordObj.score)
      }}
    >
      {wordObj.word}
      {/* Show fire round bonus indicator (earthquake 2x) */}
      {(wordObj.fireRoundBonus ?? 0) > 0 && (
        <span className="text-[10px] px-1 py-0.5 bg-neo-red text-neo-black rounded border border-neo-black font-black" title="Fire Round 2x Bonus">
          🔥+{wordObj.fireRoundBonus}
        </span>
      )}
      {/* Show combo bonus indicator */}
      {(wordObj.comboBonus ?? 0) > 0 && (
        <span className="text-[10px] px-1 py-0.5 bg-neo-lime text-neo-black rounded border border-neo-black font-black">
          +{wordObj.comboBonus}
        </span>
      )}
    </span>
  );

  if (animate) {
    return (
      <m.span
        key={wordObj.word}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.02 * Math.min(index, 10) }}
      >
        {content}
      </m.span>
    );
  }

  return content;
});

SimpleWordSpan.displayName = 'SimpleWordSpan';

/**
 * Single point group row
 */
const PointGroupRow = memo<{
  points: number;
  words: WordObject[];
  t: (key: string) => string;
  getPlayerCountForWord?: (word: string) => number;
  mode: 'chip' | 'simple';
  animate: boolean;
  groupIndex?: number;
}>(({ points, words, t, getPlayerCountForWord, mode, animate, groupIndex = 0 }) => (
  <m.div
    initial={{ opacity: 0, x: -12 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.05 * groupIndex, type: 'spring', stiffness: 300, damping: 26 }}
    className="rounded-neo p-1.5 border-l-4 border-neo-black bg-white/50 text-neo-black dark:bg-neo-navy-elevated/50"
    style={{ borderLeftColor: getPointColor(points) }}
  >
    <PointsBadge points={points} wordCount={words.length} t={t} />
    <div className="flex flex-wrap gap-1">
      {words.map((wordObj, i) => (
        mode === 'chip' ? (
          <m.div
            key={`${points}-${i}`}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.02 * Math.min(i, 15) + 0.05 * groupIndex, type: 'spring', stiffness: 400, damping: 22 }}
          >
            <WordChip
              wordObj={wordObj}
              playerCount={getPlayerCountForWord?.(wordObj.word) ?? 0}
            />
          </m.div>
        ) : (
          <SimpleWordSpan
            key={`${points}-${i}`}
            wordObj={wordObj}
            index={i}
            animate={animate}
          />
        )
      ))}
    </div>
  </m.div>
));

PointGroupRow.displayName = 'PointGroupRow';

/**
 * WordPointsGroup - Display words grouped by point value
 *
 * @example
 * ```tsx
 * // Multiplayer with WordChip
 * <WordPointsGroup
 *   wordsByPoints={wordsByPoints}
 *   sortedPointGroups={sortedPointGroups}
 *   t={t}
 *   getPlayerCountForWord={getPlayerCountForWord}
 *   mode="chip"
 * />
 *
 * // Singleplayer with simple spans
 * <WordPointsGroup
 *   wordsByPoints={wordsByPoints}
 *   sortedPointGroups={sortedPointGroups}
 *   t={t}
 *   mode="simple"
 *   animate
 * />
 * ```
 */
export const WordPointsGroup = memo<WordPointsGroupProps>(({
  wordsByPoints,
  sortedPointGroups,
  t,
  getPlayerCountForWord,
  mode = 'chip',
  className,
  animate = false,
}) => {
  // Calculate total valid word count
  const totalWordCount = useMemo(() =>
    Object.values(wordsByPoints).flat().length,
    [wordsByPoints]
  );

  if (sortedPointGroups.length === 0) return null;

  return (
    <div className={cn(
      'bg-neo-cream dark:bg-neo-navy-light rounded-neo p-2 border-3 border-neo-black shadow-hard-sm',
      className
    )}>
      {/* Header */}
      <div className="text-sm font-black text-neo-black dark:text-neo-white mb-2 flex items-center gap-2 uppercase">
        <span className="bg-neo-cyan text-neo-black px-2 py-0.5 rounded-neo border-2 border-neo-black">✓</span>
        {t('results.validWords')} ({totalWordCount})
      </div>

      {/* Point groups */}
      <div className="space-y-2">
        {sortedPointGroups.map((points, groupIdx) => {
          const wordsForPoints = wordsByPoints[points] ?? [];
          return (
            <PointGroupRow
              key={`points-${points}`}
              points={points}
              words={wordsForPoints}
              t={t}
              getPlayerCountForWord={getPlayerCountForWord}
              mode={mode}
              animate={animate}
              groupIndex={groupIdx}
            />
          );
        })}
      </div>
    </div>
  );
});

WordPointsGroup.displayName = 'WordPointsGroup';

/**
 * Shared words section for multiplayer results
 */
export interface SharedWordsSectionProps {
  duplicateWords: WordObject[];
  t: (key: string) => string;
  getPlayerCountForWord?: (word: string) => number;
  className?: string;
}

export const SharedWordsSection = memo<SharedWordsSectionProps>(({
  duplicateWords,
  t,
  getPlayerCountForWord,
  className,
}) => {
  if (duplicateWords.length === 0) return null;

  return (
    <div className={cn(
      'bg-neo-cream dark:bg-neo-navy-light rounded-neo p-2 border-3 border-neo-black shadow-hard-sm',
      className
    )}>
      <div className="text-sm font-black text-neo-black dark:text-neo-white mb-1.5 flex items-center gap-1.5 uppercase">
        <span className="bg-neo-red text-neo-black px-2 py-0.5 rounded-neo border-2 border-neo-black">👥</span>
        {t('results.shared')} ({duplicateWords.length})
      </div>
      {/* Explanation for new players */}
      <p className="text-[10px] text-neo-black/60 dark:text-slate-400 mb-2 leading-tight">
        {t('results.sharedWordsExplanation')}
      </p>
      <div className="flex flex-wrap gap-1">
        {duplicateWords.map((wordObj, i) => (
          <m.div
            key={`duplicate-${i}`}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.03 * Math.min(i, 12), type: 'spring', stiffness: 400, damping: 22 }}
          >
            <WordChip
              wordObj={wordObj}
              playerCount={getPlayerCountForWord?.(wordObj.word) ?? 0}
            />
          </m.div>
        ))}
      </div>
    </div>
  );
});

SharedWordsSection.displayName = 'SharedWordsSection';

/**
 * Invalid words section
 */
export interface InvalidWordsSectionProps {
  invalidWords: WordObject[];
  t: (key: string) => string;
  getPlayerCountForWord?: (word: string) => number;
  /** Whether to use WordChip (multiplayer) or simple spans (singleplayer) */
  mode?: 'chip' | 'simple';
  /** Language code for appeal API */
  language?: string;
  className?: string;
}

export const InvalidWordsSection = memo<InvalidWordsSectionProps>(({
  invalidWords,
  t,
  getPlayerCountForWord,
  mode = 'chip',
  language,
  className,
}) => {
  const [appealedWords, setAppealedWords] = useState<Set<string>>(new Set());
  const [appealingWord, setAppealingWord] = useState<string | null>(null);

  const handleAppeal = useCallback(async (word: string) => {
    if (appealedWords.has(word) || !language) return;
    setAppealingWord(word);
    try {
      await fetch('/api/appeal-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, language }),
      });
      setAppealedWords(prev => new Set(prev).add(word));
    } catch {
      // Silent fail — non-critical
    } finally {
      setAppealingWord(null);
    }
  }, [appealedWords, language]);

  if (invalidWords.length === 0) return null;

  const showAppeal = mode === 'chip' && !!language;

  return (
    <div className={cn(
      'bg-neo-cream dark:bg-neo-navy-light rounded-neo p-2 border-3 border-neo-black shadow-hard-sm',
      className
    )}>
      <div className="text-sm font-black text-neo-black/70 dark:text-white mb-1.5 flex items-center gap-1.5 uppercase">
        <span className="bg-neo-gray text-neo-white px-2 py-0.5 rounded-neo border-2 border-neo-black">✗</span>
        {t('results.invalid')} ({invalidWords.length})
      </div>
      <div className="flex flex-wrap gap-1">
        {invalidWords.map((wordObj, i) => (
          mode === 'chip' ? (
            <div key={`invalid-${i}`} className="inline-flex items-center gap-1">
              <WordChip
                wordObj={wordObj}
                playerCount={getPlayerCountForWord?.(wordObj.word) ?? 0}
              />
              {showAppeal && (
                <button
                  onClick={() => handleAppeal(wordObj.word)}
                  disabled={appealedWords.has(wordObj.word) || appealingWord === wordObj.word}
                  className={cn(
                    'text-[10px] font-black uppercase px-2 py-1 rounded-neo border-2 border-neo-black transition-all min-h-[32px]',
                    appealedWords.has(wordObj.word)
                      ? 'bg-neo-lime text-neo-black cursor-default'
                      : 'bg-neo-orange text-neo-black hover:bg-neo-yellow active:translate-y-px active:shadow-none shadow-hard-sm cursor-pointer'
                  )}
                  aria-label={`${t('results.appealWord')} ${wordObj.word}`}
                >
                  {appealedWords.has(wordObj.word)
                    ? t('results.appealed')
                    : appealingWord === wordObj.word
                      ? '...'
                      : t('results.appealWord')
                  }
                </button>
              )}
            </div>
          ) : (
            <span
              key={`invalid-${i}`}
              className="inline-flex items-center gap-1 px-2 py-1 text-sm font-black uppercase border-2 border-neo-black rounded-neo shadow-hard-sm opacity-70"
              style={{
                backgroundColor: 'var(--neo-red, #ef4444)',
                color: 'var(--neo-cream)'
              }}
            >
              {wordObj.word}
            </span>
          )
        ))}
      </div>
      {showAppeal && invalidWords.length > 0 && (
        <p className="text-[10px] text-neo-black/50 dark:text-slate-400 mt-1.5 leading-tight">
          {t('results.appealExplanation')}
        </p>
      )}
    </div>
  );
});

InvalidWordsSection.displayName = 'InvalidWordsSection';

export default WordPointsGroup;
