/**
 * WordHuntTargetArea
 * Shows target word blanks, previous attempts with Wordle-style feedback,
 * and input for guessing the target word
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { LetterFeedback } from '@/shared/types/game';
import type { WordFeedback } from './WordFormingArea';

interface WordHuntTargetAreaProps {
  targetLength: number;
  attempts: Array<{ guess: string; feedback: LetterFeedback[] }>;
  onSubmit: (guess: string) => void;
  found: boolean;
  /** Word submission feedback (accepted/rejected/duplicate) shown inline */
  wordFeedback?: WordFeedback | null;
}

const FEEDBACK_COLORS: Record<LetterFeedback, string> = {
  correct: 'bg-green-500 text-white',
  present: 'bg-yellow-500 text-black',
  absent: 'bg-gray-600 text-white',
};

export function WordHuntTargetArea({
  targetLength,
  attempts,
  onSubmit,
  found,
  wordFeedback,
}: WordHuntTargetAreaProps) {
  const { t } = useLanguage();
  const [guess, setGuess] = useState('');
  const [visibleFeedback, setVisibleFeedback] = useState<WordFeedback | null>(null);
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Show word feedback for 2 seconds then auto-clear
  useEffect(() => {
    if (wordFeedback) {
      setVisibleFeedback(wordFeedback);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(() => setVisibleFeedback(null), 2000);
    }
    return () => { if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current); };
  }, [wordFeedback]);

  const handleSubmit = () => {
    const trimmed = guess.trim();
    if (!trimmed || trimmed.length !== targetLength) return;
    onSubmit(trimmed);
    setGuess('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className={`flex flex-col items-center gap-3${found ? ' found-celebration' : ''}`} data-testid="word-hunt-target-area">
      {/* Target word blanks */}
      <div className="flex gap-1">
        {Array.from({ length: targetLength }).map((_, i) => (
          <div
            key={`target-blank-${i}`}
            data-testid={`target-blank-${i}`}
            className="w-7 h-7 sm:w-8 sm:h-8 border-neo border-black rounded bg-neo-navy-elevated flex items-center justify-center text-neo-white font-neo-display text-base sm:text-lg"
          >
            ?
          </div>
        ))}
      </div>

      {/* Word submission feedback (accepted/rejected/duplicate) */}
      {visibleFeedback && (
        <div
          data-testid="word-hunt-feedback"
          className={`flex items-center gap-2 px-3 py-1 rounded-neo text-sm font-neo-body ${
            visibleFeedback.type === 'accepted'
              ? 'bg-green-500/20 text-green-400'
              : visibleFeedback.type === 'duplicate'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-red-500/20 text-red-400'
          }`}
        >
          <span>{visibleFeedback.type === 'accepted' ? '✓' : visibleFeedback.type === 'duplicate' ? '⟳' : '✗'}</span>
          <span>{visibleFeedback.word}</span>
          {visibleFeedback.score && visibleFeedback.type === 'accepted' && (
            <span className="font-neo-display text-neo-lime">+{visibleFeedback.score}</span>
          )}
        </div>
      )}

      {/* Previous attempts */}
      {attempts.map((attempt, attemptIndex) => (
        <div key={attemptIndex} className="flex gap-1">
          {attempt.guess.split('').map((letter, letterIndex) => (
            <div
              key={letterIndex}
              data-testid={`attempt-${attemptIndex}-letter-${letterIndex}`}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded border-neo border-black flex items-center justify-center font-neo-display text-base sm:text-lg uppercase ${
                FEEDBACK_COLORS[attempt.feedback[letterIndex]] || 'bg-gray-600'
              }`}
            >
              {letter}
            </div>
          ))}
        </div>
      ))}

      {/* Input and submit */}
      <div className="flex gap-2 items-center">
        <input
          data-testid="target-guess-input"
          type="text"
          value={guess}
          onChange={(e) => setGuess(e.target.value.slice(0, targetLength))}
          onKeyDown={handleKeyDown}
          disabled={found}
          maxLength={targetLength}
          className="border-neo border-black rounded-neo px-2 py-1 bg-neo-navy-light text-neo-white font-neo-body uppercase w-32 text-center"
          placeholder={t('wordHunt.guessTarget')}
        />
        <button
          data-testid="target-submit-button"
          onClick={handleSubmit}
          disabled={found}
          className="border-neo border-black rounded-neo px-3 py-1 bg-neo-yellow text-black font-neo-display shadow-hard-sm hover:shadow-hard-pressed active:shadow-hard-pressed disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {found ? t('wordHunt.found') : t('wordHunt.submit')}
        </button>
      </div>
    </div>
  );
}
