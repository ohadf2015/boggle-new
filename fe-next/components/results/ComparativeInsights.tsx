'use client';

import React, { useMemo } from 'react';
import { Sparkles, TrendingUp, Fingerprint } from 'lucide-react';

type TFunction = (key: string, params?: Record<string, string | number>) => string;

interface ComparativeInsightsProps {
  allPlayerWords: Record<string, Array<{ word: string; score: number }>>;
  currentUsername: string;
  t: TFunction;
}

/**
 * ComparativeInsights - Shows how the current player performed relative to others.
 *
 * Displays unique word count, longest word comparison, and score comparison.
 * Only renders when there's meaningful comparative data (>1 player).
 */
const ComparativeInsights: React.FC<ComparativeInsightsProps> = ({
  allPlayerWords,
  currentUsername,
  t,
}) => {
  const insights = useMemo(() => {
    const playerNames = Object.keys(allPlayerWords);
    if (playerNames.length < 2) return null;

    const currentWords = allPlayerWords[currentUsername];
    if (!currentWords || currentWords.length === 0) return null;

    // Unique words: words only the current player found
    const otherWordSets = playerNames
      .filter(name => name !== currentUsername)
      .map(name => new Set((allPlayerWords[name] || []).map(w => w.word.toLowerCase())));

    const uniqueWords = currentWords.filter(w => {
      const lower = w.word.toLowerCase();
      return otherWordSets.every(set => !set.has(lower));
    });

    // Longest word comparison
    const currentLongest = currentWords.reduce((max, w) => Math.max(max, w.word.length), 0);
    const otherLongestValues = playerNames
      .filter(name => name !== currentUsername)
      .map(name => (allPlayerWords[name] || []).reduce((max, w) => Math.max(max, w.word.length), 0));
    const avgOtherLongest = otherLongestValues.length > 0
      ? otherLongestValues.reduce((a, b) => a + b, 0) / otherLongestValues.length
      : 0;
    const longestDiff = Math.round(currentLongest - avgOtherLongest);

    // Score comparison
    const currentScore = currentWords.reduce((sum, w) => sum + (w.score || 0), 0);
    const otherScores = playerNames
      .filter(name => name !== currentUsername)
      .map(name => (allPlayerWords[name] || []).reduce((sum, w) => sum + (w.score || 0), 0));
    const avgOtherScore = otherScores.length > 0
      ? otherScores.reduce((a, b) => a + b, 0) / otherScores.length
      : 0;
    const scorePctDiff = avgOtherScore > 0
      ? Math.round(((currentScore - avgOtherScore) / avgOtherScore) * 100)
      : 0;

    return { uniqueWordCount: uniqueWords.length, longestDiff, scorePctDiff };
  }, [allPlayerWords, currentUsername]);

  if (!insights) return null;

  const { uniqueWordCount, longestDiff, scorePctDiff } = insights;

  // Only show if there's at least one meaningful insight
  const hasData = uniqueWordCount > 0 || longestDiff !== 0 || scorePctDiff !== 0;
  if (!hasData) return null;

  return (
    <div className="bg-neo-navy/60 border-3 border-neo-black rounded-neo shadow-hard-sm p-3 space-y-2">
      <h3 className="text-sm font-black text-neo-yellow uppercase tracking-wide">
        {t('results.comparativeInsights.title')}
      </h3>
      <div className="space-y-1.5">
        {uniqueWordCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-neo-white">
            <Fingerprint className="w-4 h-4 text-neo-cyan shrink-0" />
            <span>
              {t('results.comparativeInsights.uniqueWords', { count: uniqueWordCount }) ||
                `You found ${uniqueWordCount} word${uniqueWordCount !== 1 ? 's' : ''} nobody else found!`}
            </span>
          </div>
        )}
        {longestDiff > 0 && (
          <div className="flex items-center gap-2 text-sm text-neo-white">
            <TrendingUp className="w-4 h-4 text-neo-lime shrink-0" />
            <span>
              {t('results.comparativeInsights.longestWord', { count: longestDiff }) ||
                `Your longest word was ${longestDiff} letter${longestDiff !== 1 ? 's' : ''} longer than average`}
            </span>
          </div>
        )}
        {scorePctDiff !== 0 && (
          <div className="flex items-center gap-2 text-sm text-neo-white">
            <Sparkles className="w-4 h-4 text-neo-orange shrink-0" />
            <span>
              {scorePctDiff > 0
                ? (t('results.comparativeInsights.scoreAbove', { pct: scorePctDiff }) ||
                    `You scored ${scorePctDiff}% more than the average`)
                : (t('results.comparativeInsights.scoreBelow', { pct: Math.abs(scorePctDiff) }) ||
                    `You scored ${Math.abs(scorePctDiff)}% less than the average`)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComparativeInsights;
