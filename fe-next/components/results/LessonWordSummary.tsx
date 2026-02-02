'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WordDetail } from '@/shared/types/game';

export interface LessonWordSummaryProps {
  /** Player's word details including fromLesson flag */
  playerWordDetails?: WordDetail[];
  /** All lesson vocabulary words (uppercase) */
  lessonVocabulary?: Set<string>;
  /** Player's username */
  username: string;
  /** Translation function */
  t: (key: string, params?: Record<string, unknown>) => string;
}

/**
 * LessonWordSummary - Shows lesson vocabulary performance in post-game results
 *
 * Displays:
 * - Total lesson words found
 * - Completion percentage
 * - List of found and missed lesson words
 */
export function LessonWordSummary({
  playerWordDetails = [],
  lessonVocabulary,
  username,
  t
}: LessonWordSummaryProps) {
  const stats = useMemo(() => {
    // Return empty stats if no lesson vocabulary
    if (!lessonVocabulary || lessonVocabulary.size === 0) {
      return {
        foundWords: [],
        missedWords: [],
        foundCount: 0,
        totalCount: 0,
        completionPercent: 0
      };
    }
    // Get lesson words that were found by the player
    const foundLessonWords = playerWordDetails
      .filter(wd => wd.fromLesson)
      .map(wd => wd.word.toUpperCase());

    // Get all lesson words that were on the board (matched player's found words)
    const lessonWordsOnBoard = Array.from(lessonVocabulary);

    // Calculate missed lesson words
    const missedLessonWords = lessonWordsOnBoard.filter(
      word => !foundLessonWords.includes(word)
    );

    const foundCount = foundLessonWords.length;
    const totalCount = lessonWordsOnBoard.length;
    const completionPercent = totalCount > 0 ? Math.round((foundCount / totalCount) * 100) : 0;

    return {
      foundWords: foundLessonWords,
      missedWords: missedLessonWords,
      foundCount,
      totalCount,
      completionPercent
    };
  }, [playerWordDetails, lessonVocabulary]);

  // Don't show if no lesson vocabulary or no lesson words were available
  if (!lessonVocabulary || lessonVocabulary.size === 0 || stats.totalCount === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-neo border-neo-thick border-neo-purple bg-gradient-to-br from-neo-purple/20 to-neo-pink/20 shadow-hard-lg"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-neo border-neo border-neo-black bg-neo-purple">
          <BookOpen className="w-6 h-6 text-neo-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-neo-display font-black text-neo-white">
            {t('education.lessonWords.title')}
          </h3>
          <p className="text-sm text-neo-white/70 font-neo-body">
            {t('education.lessonWords.subtitle')}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* Found Count */}
        <div className="p-3 rounded-neo border-neo border-neo-black bg-neo-lime text-center">
          <div className="text-2xl font-black text-neo-black">
            {stats.foundCount}
          </div>
          <div className="text-xs font-bold text-neo-black/70">
            {t('education.lessonWords.found')}
          </div>
        </div>

        {/* Total Count */}
        <div className="p-3 rounded-neo border-neo border-neo-black bg-neo-cyan text-center">
          <div className="text-2xl font-black text-neo-black">
            {stats.totalCount}
          </div>
          <div className="text-xs font-bold text-neo-black/70">
            {t('education.lessonWords.total')}
          </div>
        </div>

        {/* Completion Percentage */}
        <div className={cn(
          "p-3 rounded-neo border-neo border-neo-black text-center",
          stats.completionPercent >= 80 ? "bg-neo-lime" :
          stats.completionPercent >= 50 ? "bg-neo-yellow" :
          "bg-neo-orange"
        )}>
          <div className="text-2xl font-black text-neo-black">
            {stats.completionPercent}%
          </div>
          <div className="text-xs font-bold text-neo-black/70">
            {t('education.lessonWords.completion')}
          </div>
        </div>
      </div>

      {/* Word Lists */}
      <div className="space-y-3">
        {/* Found Words */}
        {stats.foundWords.length > 0 && (
          <div className="p-3 rounded-neo border-neo border-neo-black bg-neo-navy/30">
            <div className="flex items-center gap-2 mb-2">
              <Check className="w-4 h-4 text-neo-lime" />
              <span className="text-sm font-bold text-neo-white">
                {t('education.lessonWords.foundList')}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {stats.foundWords.map((word) => (
                <span
                  key={word}
                  className="px-2 py-1 text-xs font-bold bg-neo-lime text-neo-black rounded-md border border-neo-black"
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Missed Words */}
        {stats.missedWords.length > 0 && (
          <div className="p-3 rounded-neo border-neo border-neo-black bg-neo-navy/30">
            <div className="flex items-center gap-2 mb-2">
              <X className="w-4 h-4 text-neo-red" />
              <span className="text-sm font-bold text-neo-white">
                {t('education.lessonWords.missedList')}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {stats.missedWords.map((word) => (
                <span
                  key={word}
                  className="px-2 py-1 text-xs font-bold bg-neo-red/30 text-neo-white rounded-md border border-neo-red"
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Encouragement Message */}
      {stats.completionPercent === 100 && (
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 p-3 rounded-neo border-neo border-neo-black bg-neo-lime text-center"
        >
          <p className="text-sm font-black text-neo-black">
            🎉 {t('education.lessonWords.perfectScore')}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
