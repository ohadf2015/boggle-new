'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Flame, Sparkles } from 'lucide-react';
import { useBlitzGame } from './hooks/useBlitzGame';
import CircularTimer from '../CircularTimer';
import PracticeResultsCard from './PracticeResultsCard';
import type { VocabularyWord } from '@/lib/supabase/education/types';

export interface TimedBlitzPracticeProps {
  words: VocabularyWord[];
  onComplete: (results: {
    wordsFound: number;
    wordsAttempted: number;
    combo: number;
    maxCombo: number;
    score: number;
  }) => void;
  onBack: () => void;
  /** XP session data to display on results screen (optional) */
  xpSessionData?: {
    sessionXpEarned: number;
    sessionMasteryMessage: string | null;
  };
}

type GamePhase = 'countdown' | 'playing' | 'timesup' | 'results';

/**
 * TimedBlitzPractice - 60-second speed round practice mode
 *
 * Features:
 * - 3-2-1 countdown intro
 * - CircularTimer with urgency styling
 * - Combo system with visual feedback
 * - Immediate next word on answer (no pause)
 * - Score tracking with running total
 * - TIME'S UP animation
 * - Results display with PracticeResultsCard
 */
export function TimedBlitzPractice({
  words,
  onComplete,
  onBack,
  xpSessionData,
}: TimedBlitzPracticeProps) {
  const { t, dir } = useLanguage();
  const isRTL = dir === 'rtl';

  const [phase, setPhase] = useState<GamePhase>('countdown');
  const [countdown, setCountdown] = useState(3);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    currentWord,
    remainingTime,
    combo,
    maxCombo,
    wordsFound,
    wordsAttempted,
    isGameOver,
    isStarted,
    score,
    submitAnswer,
    startGame,
  } = useBlitzGame(words, 60);

  /**
   * Countdown phase effect
   * 3-2-1 countdown before game starts
   */
  useEffect(() => {
    if (phase !== 'countdown') return;

    const timer = setTimeout(() => {
      if (countdown > 1) {
        setCountdown(countdown - 1);
      } else {
        // Start the game
        setPhase('playing');
        startGame();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [phase, countdown, startGame]);

  /**
   * Focus input when playing
   */
  useEffect(() => {
    if (phase === 'playing' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [phase]);

  /**
   * Handle game over
   */
  useEffect(() => {
    if (isGameOver && phase === 'playing') {
      setPhase('timesup');

      // Show TIME'S UP for 1.5 seconds, then results
      setTimeout(() => {
        setPhase('results');
        onComplete({
          wordsFound,
          wordsAttempted,
          combo,
          maxCombo,
          score,
        });
      }, 1500);
    }
  }, [isGameOver, phase, wordsFound, wordsAttempted, combo, maxCombo, score, onComplete]);

  /**
   * Handle answer submission
   */
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!isStarted || isGameOver || !inputValue.trim()) {
        return;
      }

      // Submit answer
      submitAnswer(inputValue);

      // Clear input immediately (no pause)
      setInputValue('');

      // Keep focus
      inputRef.current?.focus();
    },
    [inputValue, isStarted, isGameOver, submitAnswer]
  );

  /**
   * Handle restart
   */
  const handleRestart = useCallback(() => {
    setPhase('countdown');
    setCountdown(3);
    setInputValue('');
  }, []);

  /**
   * Urgency flags
   */
  const isLowTime = remainingTime <= 20;
  const isVeryLowTime = remainingTime <= 10;

  return (
    <div
      className={cn(
        'w-full h-full flex flex-col items-center justify-center',
        'p-4 relative'
      )}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <AdaptiveAnimatePresence mode="wait">
        {/* COUNTDOWN PHASE */}
        {phase === 'countdown' && (
          <AdaptiveMotion.div
            key="countdown"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="text-center"
            data-testid="countdown-phase"
          >
            <AdaptiveMotion.div
              key={countdown}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className={cn(
                'text-[120px] font-neo-display',
                'text-neo-yellow',
                'drop-shadow-[4px_4px_0px_rgba(0,0,0,0.5)]'
              )}
            >
              {countdown}
            </AdaptiveMotion.div>
          </AdaptiveMotion.div>
        )}

        {/* PLAYING PHASE */}
        {phase === 'playing' && (
          <AdaptiveMotion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              'w-full max-w-2xl flex flex-col gap-6',
              isLowTime && 'urgency-pulse',
              isVeryLowTime && 'urgency-red'
            )}
            data-testid="playing-phase"
          >
            {/* Top section: Timer and Combo */}
            <div className="flex items-center justify-between">
              {/* Timer */}
              <div>
                <CircularTimer remainingTime={remainingTime} totalTime={60} size="lg" />
              </div>

              {/* Combo display */}
              <div data-testid="combo-display" className="flex items-center gap-2">
                {combo > 0 && (
                  <AdaptiveMotion.div
                    data-testid="combo-badge"
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.3, 1] }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className={cn(
                      'px-4 py-2 rounded-neo',
                      'bg-neo-orange border-neo border-neo-black',
                      'shadow-hard',
                      'flex items-center gap-2'
                    )}
                  >
                    <Flame className="w-5 h-5 text-neo-yellow" />
                    <span className="font-neo-display text-neo-white text-xl">
                      {combo}x {t('education.practice.combo')}!
                    </span>
                  </AdaptiveMotion.div>
                )}
              </div>

              {/* Score */}
              <AdaptiveMotion.div
                key={score}
                data-testid="score-display"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'px-4 py-2 rounded-neo',
                  'bg-neo-yellow/20 border-neo border-neo-yellow',
                  'font-neo-display text-neo-yellow text-2xl'
                )}
              >
                {score}
              </AdaptiveMotion.div>
            </div>

            {/* Center: Definition card */}
            <AdaptiveMotion.div
              key={currentWord?.word || 'empty'}
              initial={{ x: isRTL ? -20 : 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.15 }}
              data-testid="definition-card"
              className={cn(
                'p-8 rounded-neo',
                'bg-neo-navy border-neo-thick border-neo-black',
                'shadow-hard-lg',
                'min-h-[150px] flex items-center justify-center'
              )}
            >
              <p className="font-neo-body text-neo-white text-2xl text-center">
                {currentWord?.definition || t('education.practice.noWords')}
              </p>
            </AdaptiveMotion.div>

            {/* Bottom: Input form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isGameOver}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-testid="word-input"
                className={cn(
                  'px-6 py-4 rounded-neo',
                  'border-neo-thick border-neo-black',
                  'bg-neo-white text-neo-black',
                  'font-neo-body text-xl',
                  'shadow-hard',
                  'focus:outline-hidden focus:ring-4 focus:ring-neo-cyan',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-all'
                )}
                placeholder={t('education.practice.typeAnswer')}
              />

              <button
                type="submit"
                disabled={isGameOver || !inputValue.trim()}
                className={cn(
                  'px-6 py-4 rounded-neo',
                  'bg-neo-cyan hover:bg-neo-cyan/90',
                  'border-neo-thick border-neo-black',
                  'shadow-hard hover:shadow-hard-lg',
                  'font-neo-display text-neo-black text-xl',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-all active:translate-y-1'
                )}
              >
                {t('education.practice.submit')}
              </button>
            </form>
          </AdaptiveMotion.div>
        )}

        {/* TIME'S UP PHASE */}
        {phase === 'timesup' && (
          <AdaptiveMotion.div
            key="timesup"
            initial={{ scale: 0, opacity: 0, rotate: -180 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="text-center"
            data-testid="times-up"
          >
            <div
              className={cn(
                'text-[80px] font-neo-display',
                'text-neo-red',
                'drop-shadow-[4px_4px_0px_rgba(0,0,0,0.5)]'
              )}
            >
              {t('education.practice.timesUp')}
            </div>
            <Sparkles className="w-12 h-12 text-neo-yellow mx-auto mt-4" />
          </AdaptiveMotion.div>
        )}

        {/* RESULTS PHASE */}
        {phase === 'results' && (
          <AdaptiveMotion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-lg"
          >
            <PracticeResultsCard
              correct={wordsFound}
              total={wordsAttempted}
              xpEarned={xpSessionData?.sessionXpEarned}
              masteryMessage={xpSessionData?.sessionMasteryMessage ?? undefined}
              onRestart={handleRestart}
              onBack={onBack}
            />
          </AdaptiveMotion.div>
        )}
      </AdaptiveAnimatePresence>
    </div>
  );
}

export default TimedBlitzPractice;
