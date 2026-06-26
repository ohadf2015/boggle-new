'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Lightbulb, Check, X } from 'lucide-react';
import { useSpellingGame } from './hooks/useSpellingGame';
import PracticeResultsCard from './PracticeResultsCard';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import type { EnrichedVocabularyWord } from '@/types/vocabulary';
import { WordContextRow } from './WordContextRow';
import { PronunciationButton } from './PronunciationButton';

export interface SpellingChallengePracticeProps {
  words: VocabularyWord[];
  onComplete: (results: { correct: number; total: number; accuracy: number }) => void;
  onBack: () => void;
  /** XP session data to display on results screen (optional) */
  xpSessionData?: {
    sessionXpEarned: number;
    sessionMasteryMessage: string | null;
  };
}

/**
 * SpellingChallengePractice - Type-the-word spelling practice mode
 *
 * Features:
 * - Shows definition, student types the word
 * - Progressive difficulty (shorter words first)
 * - Hint system (first letter free, additional hints reset streak)
 * - Streak tracking with visual feedback
 * - Auto-advance after answer (1s correct, 2s incorrect)
 * - Results display with PracticeResultsCard
 */
export function SpellingChallengePractice({
  words,
  onComplete,
  onBack,
  xpSessionData,
}: SpellingChallengePracticeProps) {
  const { t, dir, language } = useLanguage();
  const isRTL = dir === 'rtl';

  const {
    currentWord,
    wordIndex,
    totalWords,
    currentHint,
    getHint,
    submitAnswer,
    currentStreak,
    maxStreak,
    hintsUsed,
    correctCount,
    attempts,
    accuracy,
    isComplete,
    resetGame,
  } = useSpellingGame(words);

  // Mirror the hook's sort-by-length so wordIndex maps to the right enriched word
  const sortedWords = useMemo(
    () => [...words].sort((a, b) => a.word.length - b.word.length),
    [words]
  );

  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback] = useState<{ correct: boolean; correctWord: string } | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [totalHintsUsed, setTotalHintsUsed] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const sessionStartRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize session start time
  useEffect(() => {
    sessionStartRef.current = Date.now();
  }, []);

  // Focus input on mount and word change
  useEffect(() => {
    if (!isComplete && !feedback && inputRef.current) {
      inputRef.current.focus();
    }
  }, [wordIndex, isComplete, feedback]);

  // Show results and report completion when game ends
  useEffect(() => {
    if (isComplete && !showResults) {
      setTimeSpent(Math.floor((Date.now() - sessionStartRef.current) / 1000));
      setTimeout(() => {
        setShowResults(true);
        onComplete({ correct: correctCount, total: attempts, accuracy });
      }, 500);
    }
  }, [isComplete, showResults, onComplete, correctCount, attempts, accuracy]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputValue.trim() || feedback) return;

      const result = submitAnswer(inputValue);
      setFeedback(result);
      setInputValue('');

      // Clear feedback after auto-advance delay
      const delay = result.correct ? 1000 : 2000;
      setTimeout(() => {
        setFeedback(null);
      }, delay);
    },
    [inputValue, feedback, submitAnswer]
  );

  const handleRestart = useCallback(() => {
    resetGame();
    setShowResults(false);
    setFeedback(null);
    setInputValue('');
    setTotalHintsUsed(0);
    setTimeSpent(0);
    sessionStartRef.current = Date.now();
  }, [resetGame]);


  // Track hints used across all words — intentionally fires on word transition only
  useEffect(() => {
    setTotalHintsUsed(prev => prev + hintsUsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordIndex]);

  if (showResults) {
    return (
      <div className="min-h-screen bg-neo-navy flex items-center justify-center p-4">
        <PracticeResultsCard
          correct={correctCount}
          total={attempts}
          xpEarned={xpSessionData?.sessionXpEarned}
          masteryMessage={xpSessionData?.sessionMasteryMessage ?? undefined}
          onRestart={handleRestart}
          onBack={onBack}
          timeSpent={timeSpent}
          maxStreak={maxStreak}
          hintsUsed={totalHintsUsed}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neo-navy p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            aria-label={t('common.back')}
            className="text-neo-white hover:text-neo-white hover:bg-neo-white/10"
          >
            <ArrowLeft className={cn('w-5 h-5', isRTL && 'rotate-180')} />
          </Button>

          <div className="text-center">
            <h2 className="text-xl font-neo-display text-neo-white mb-1">
              {t('education.practice.spellTheWord')}
            </h2>
            <div className="flex flex-col items-center gap-1">
              <p className="text-neo-white font-neo-body" data-testid="progress-text">
                {wordIndex + (isComplete ? 0 : 0)} / {totalWords}
              </p>
              <div className="h-1 w-20 bg-neo-black/30 rounded-neo overflow-hidden">
                <AdaptiveMotion.div
                  className="h-full bg-neo-cyan"
                  animate={{ width: `${(wordIndex / totalWords) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </div>

          <div className="w-10" />
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Streak display */}
        {currentStreak > 0 && (
          <AdaptiveMotion.div
            data-testid="streak-display"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={cn(
              'mx-auto w-fit px-4 py-2 rounded-neo',
              'bg-neo-orange border-neo border-neo-black shadow-hard',
              'font-neo-display text-neo-white text-lg'
            )}
          >
            {currentStreak}x {t('education.practice.streak')}!
          </AdaptiveMotion.div>
        )}

        {/* Definition card */}
        <AdaptiveAnimatePresence mode="wait">
          <AdaptiveMotion.div
            key={wordIndex}
            initial={{ x: isRTL ? -20 : 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isRTL ? 20 : -20, opacity: 0 }}
            transition={{ duration: 0.2 }}
            data-testid="definition-card"
            className={cn(
              'p-8 rounded-neo',
              'bg-neo-navy border-neo-thick border-neo-black',
              'shadow-hard-lg',
              'min-h-[120px] flex items-center justify-center'
            )}
          >
            <p className="font-neo-body text-neo-white text-2xl text-center">
              {currentWord?.definition || t('education.practice.noWords')}
            </p>
            <WordContextRow
              partOfSpeech={(sortedWords[wordIndex] as Partial<EnrichedVocabularyWord>)?.partOfSpeech}
              example={(sortedWords[wordIndex] as Partial<EnrichedVocabularyWord>)?.examples?.[0]?.text}
            />
          </AdaptiveMotion.div>
        </AdaptiveAnimatePresence>

        {/* Hint display */}
        <div
          data-testid="hint-display"
          className="flex items-center justify-center gap-3"
        >
          <span className="font-mono text-neo-cyan text-2xl tracking-widest">
            {currentHint}{'_'.repeat(Math.max(0, (words[wordIndex]?.word.length || 0) - currentHint.length))}
          </span>
          {sortedWords[wordIndex] && (
            <PronunciationButton
              word={sortedWords[wordIndex].word}
              lang={language}
              size="sm"
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={getHint}
            disabled={!!feedback || isComplete}
            data-testid="hint-button"
            className="text-neo-yellow hover:text-neo-yellow/80"
          >
            <Lightbulb className="w-5 h-5" />
          </Button>
        </div>

        {/* Feedback display */}
        <AdaptiveAnimatePresence>
          {feedback && (
            <AdaptiveMotion.div
              data-testid="feedback-display"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 1] }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.25, times: [0, 0.6, 1] }}
              className={cn(
                'p-4 rounded-neo border-neo text-center',
                feedback.correct
                  ? 'bg-neo-green/20 border-neo-green'
                  : 'bg-neo-pink/20 border-neo-pink animate-neo-shake'
              )}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <AdaptiveMotion.div
                  initial={{ rotate: -180, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.2 }}
                >
                  {feedback.correct ? (
                    <Check className="w-6 h-6 text-neo-green" />
                  ) : (
                    <X className="w-6 h-6 text-neo-pink" />
                  )}
                </AdaptiveMotion.div>
                <AdaptiveMotion.span
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.15, duration: 0.15 }}
                  className={cn(
                    'font-neo-display text-lg',
                    feedback.correct ? 'text-neo-green' : 'text-neo-pink'
                  )}
                >
                  {feedback.correct
                    ? (t('education.practice.correct'))
                    : (t('education.practice.incorrect'))}
                </AdaptiveMotion.span>
              </div>
              {!feedback.correct && (
                <p className="text-neo-white font-neo-body">
                  {t('education.practice.correctAnswer')}{' '}
                  <span className="text-neo-white font-bold">{feedback.correctWord}</span>
                </p>
              )}
            </AdaptiveMotion.div>
          )}
        </AdaptiveAnimatePresence>

        {/* Input form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={!!feedback || isComplete}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-testid="spelling-input"
            aria-label={t('education.practice.spellTheWord')}
            className={cn(
              'px-6 py-4 rounded-neo',
              'border-neo-thick border-neo-black',
              'bg-neo-white text-neo-black',
              'font-neo-body text-xl',
              'shadow-hard',
              'focus:outline-hidden focus:ring-4 focus:ring-neo-purple',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-all'
            )}
            placeholder={t('education.practice.typeWord')}
          />
          <button
            type="submit"
            disabled={!!feedback || isComplete || !inputValue.trim()}
            className={cn(
              'px-6 py-4 rounded-neo',
              'bg-neo-purple hover:bg-neo-purple/90',
              'border-neo-thick border-neo-black',
              'shadow-hard hover:shadow-hard-lg',
              'font-neo-display text-neo-white text-xl',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-all active:translate-y-1'
            )}
          >
            {t('education.practice.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}

export default SpellingChallengePractice;
