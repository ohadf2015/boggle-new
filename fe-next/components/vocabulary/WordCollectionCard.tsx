'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWordCollection } from '@/hooks/useWordCollection';
import { BookOpen, Brain } from 'lucide-react';

export interface WordCollectionCardProps {
  onReviewClick?: () => void;
  className?: string;
}

/**
 * Landing page card showing the player's word collection status.
 * Displays total words, due-for-review count, mastery progress, and recent words.
 */
export function WordCollectionCard({ onReviewClick, className = '' }: WordCollectionCardProps) {
  const { t } = useLanguage();
  const { words, dueForReview, totalCollected, masteredCount } = useWordCollection();

  const masteryPercent = totalCollected > 0
    ? Math.round((masteredCount / totalCollected) * 100)
    : 0;

  const recentWords = words.slice(-5).reverse();

  return (
    <div
      className={`border-neo rounded-neo bg-neo-navy p-4 shadow-hard ${className}`}
      data-testid="word-collection-card"
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-neo-yellow" aria-hidden="true" />
        <h3 className="font-neo-display text-lg font-bold text-neo-white">
          {t('vocabulary.title')}
        </h3>
        <Brain className="h-4 w-4 text-neo-cyan" aria-hidden="true" />
      </div>

      {/* Empty state */}
      {totalCollected === 0 && (
        <p className="text-sm text-neutral-400">
          {t('vocabulary.empty')}
        </p>
      )}

      {/* Stats */}
      {totalCollected > 0 && (
        <>
          <div className="mb-3 flex flex-wrap gap-3 text-sm">
            <span className="text-neo-white">
              {t('vocabulary.totalCollected', { count: totalCollected })}
            </span>
            <span className="text-neo-cyan">
              {t('vocabulary.mastered', { count: masteredCount })}
            </span>
          </div>

          {/* Progress bar */}
          <div className="mb-3">
            <div
              role="progressbar"
              aria-valuenow={masteryPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-2 w-full overflow-hidden rounded-full border border-neutral-700 bg-neo-navy-light"
            >
              <div
                className="h-full rounded-full bg-neo-cyan transition-all duration-300"
                style={{ width: `${masteryPercent}%` }}
              />
            </div>
          </div>

          {/* Recent words */}
          {recentWords.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {recentWords.map(w => (
                <span
                  key={w.word}
                  className="rounded-neo border border-neutral-700 bg-neo-navy-light px-2 py-0.5 text-xs font-medium text-neo-white"
                >
                  {w.word}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {/* Due for review CTA */}
      {dueForReview.length > 0 && (
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm font-medium text-neo-orange">
            {t('vocabulary.dueForReview', { count: dueForReview.length })}
          </span>
          <button
            onClick={onReviewClick}
            className="rounded-neo border-neo bg-neo-yellow px-3 py-1 text-sm font-bold text-black shadow-hard-sm transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
          >
            {t('vocabulary.reviewNow')}
          </button>
        </div>
      )}
    </div>
  );
}
