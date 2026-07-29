'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { CollectedWord } from '@/hooks/useWordCollection';

export interface VocabularyReviewProps {
  words: CollectedWord[];
  onReview: (word: string, quality: 0 | 1 | 2 | 3 | 4 | 5) => void;
  onComplete: () => void;
}

/**
 * Spaced repetition review screen. Shows words one at a time with
 * three response options that map to SM-2 quality scores.
 */
export function VocabularyReview({ words, onReview, onComplete }: VocabularyReviewProps) {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(words.length === 0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    if (words.length === 0) {
      setIsComplete(true);
      onComplete();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnswer = useCallback(
    (quality: 0 | 3 | 5) => {
      const currentWord = words[currentIndex];
      if (!currentWord) return;

      onReview(currentWord.word, quality);
      setIsFlipped(false);

      const nextIndex = currentIndex + 1;
      if (nextIndex >= words.length) {
        setIsComplete(true);
        onComplete();
      } else {
        setCurrentIndex(nextIndex);
      }
    },
    [currentIndex, words, onReview, onComplete]
  );

  // Completion screen
  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-4xl" aria-hidden="true">
          &#x2705;
        </div>
        <h2 className="font-neo-display text-xl font-bold text-neo-white">
          {t('vocabulary.reviewComplete')}
        </h2>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const progress = `${currentIndex + 1} / ${words.length}`;

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      {/* Progress */}
      <div className="text-sm font-medium text-neutral-400">
        {progress}
      </div>

      {/* Word card */}
      <div
        className={`flex min-h-[160px] w-full max-w-md cursor-pointer items-center justify-center rounded-neo border-neo bg-neo-navy-light p-6 shadow-hard transition-transform duration-300 ${
          isFlipped ? 'rotate-y-0' : ''
        }`}
        onClick={() => setIsFlipped(!isFlipped)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsFlipped(!isFlipped);
          }
        }}
        aria-label={currentWord.word}
      >
        <span className="font-neo-display text-2xl font-bold text-neo-white">
          {currentWord.word}
        </span>
      </div>

      {/* Context info */}
      <p className="text-xs text-neutral-500">
        {currentWord.context.foundInMode} &middot; {currentWord.context.date}
      </p>

      {/* Response buttons */}
      <div className="flex w-full max-w-md gap-3">
        <button
          onClick={() => handleAnswer(0)}
          className="flex-1 rounded-neo border-neo bg-red-600 px-3 py-2 text-sm font-bold text-white shadow-hard-sm transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
        >
          {t('vocabulary.forgot')}
        </button>
        <button
          onClick={() => handleAnswer(3)}
          className="flex-1 rounded-neo border-neo bg-neo-orange px-3 py-2 text-sm font-bold text-white shadow-hard-sm transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
        >
          {t('vocabulary.somewhat')}
        </button>
        <button
          onClick={() => handleAnswer(5)}
          className="flex-1 rounded-neo border-neo bg-green-600 px-3 py-2 text-sm font-bold text-white shadow-hard-sm transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
        >
          {t('vocabulary.iKnowIt')}
        </button>
      </div>
    </div>
  );
}
