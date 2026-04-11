'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageLoader } from '@/components/ui/PageLoader';
import WordWheelGame, { type WordWheelGameResult } from './WordWheelGame';
import WordWheelResults from './WordWheelResults';
import {
  generateWordWheelPuzzle,
  type WordWheelPuzzle,
} from '@/utils/dailyChallenge/wordWheelGeneration';
import {
  getDailyChallengeDate,
  getPuzzleNumber,
  hasPlayedWordWheelToday,
  getTodaysWordWheelResult,
  saveWordWheelResult,
  hasPlayedWordHuntToday,
  getDailyStreak,
} from '@/utils/dailyChallenge';
import type { Language } from '@/types';

// ==========================================
// Types
// ==========================================

type WordWheelPhase = 'loading' | 'ready' | 'playing' | 'completed' | 'already-played';

const WORD_WHEEL_DURATION = 120; // 2 minutes

// ==========================================
// Word Wheel Challenge Orchestrator
// ==========================================

const WordWheelChallenge: React.FC = () => {
  const { t, language } = useLanguage();

  const [phase, setPhase] = useState<WordWheelPhase>('loading');
  const [puzzle, setPuzzle] = useState<WordWheelPuzzle | null>(null);
  const [gameResult, setGameResult] = useState<WordWheelGameResult | null>(null);
  const [puzzleNumber, setPuzzleNumber] = useState(0);
  const [hasPlayedWH, setHasPlayedWH] = useState(false);

  // Initialize puzzle
  useEffect(() => {
    const date = getDailyChallengeDate();
    const number = getPuzzleNumber(date);
    setPuzzleNumber(number);

    const gameLang = language as Language;

    // Check if already played
    if (hasPlayedWordWheelToday(gameLang)) {
      const stored = getTodaysWordWheelResult(gameLang);
      if (stored) {
        setGameResult({
          wordsFound: stored.result.wordsFound,
          score: stored.result.score,
          timeSeconds: stored.result.timeSeconds,
        });
      }
      setPhase('already-played');
    } else {
      const generatedPuzzle = generateWordWheelPuzzle(date, gameLang);
      setPuzzle(generatedPuzzle);
      setPhase('ready');
    }

    setHasPlayedWH(hasPlayedWordHuntToday(gameLang));
  }, [language]);

  // Server-side dictionary validation via existing /api/validate-word
  const handleValidateWord = useCallback(async (word: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/validate-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, language }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      return data.isValid === true;
    } catch {
      // Fallback: accept word if server is unreachable (offline play)
      return word.length >= 3;
    }
  }, [language]);

  const handleStart = useCallback(() => {
    setPhase('playing');
  }, []);

  const handleComplete = useCallback((result: WordWheelGameResult) => {
    setGameResult(result);

    const gameLang = language as Language;
    const date = getDailyChallengeDate();
    const streak = getDailyStreak();

    saveWordWheelResult({
      puzzleNumber,
      puzzleDate: date,
      language: gameLang,
      centerLetter: puzzle?.centerLetter || '',
      wordsFound: result.wordsFound,
      totalPossible: 0, // Unknown without server
      score: result.score,
      timeSeconds: result.timeSeconds,
      streakDays: streak.currentStreak,
      completedAt: new Date().toISOString(),
    });

    setPhase('completed');
  }, [language, puzzle, puzzleNumber]);

  // ==========================================
  // Render phases
  // ==========================================

  if (phase === 'loading') {
    return (
      <div className="flex-1 flex items-center justify-center bg-neo-navy">
        <PageLoader size="lg" text="Loading Word Wheel..." />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-neo-navy min-h-screen">
      <AnimatePresence mode="wait">
        {/* Ready screen */}
        {phase === 'ready' && puzzle && (
          <motion.div
            key="ready"
            className="flex-1 flex flex-col items-center justify-center gap-6 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-center">
              <h1 className="font-neo-display font-black text-3xl sm:text-4xl text-neo-white mb-2">
                {t('wordWheel.title')}
              </h1>
              <span className="text-neo-cream/60 text-sm">
                {t('daily.puzzleNumber').replace('{number}', String(puzzleNumber))}
              </span>
            </div>

            <p className="text-neo-cream/80 text-center max-w-sm">
              {t('wordWheel.description')}
            </p>

            {/* Preview wheel (small) */}
            <div className="relative w-36 h-36 flex items-center justify-center my-4">
              <div className="w-12 h-12 rounded-full border-3 border-neo-black bg-neo-lime flex items-center justify-center font-neo-display font-black text-xl text-neo-black shadow-hard">
                {puzzle.centerLetter}
              </div>
              {puzzle.outerLetters.map((letter, i) => {
                const angle = i * 45;
                const rad = (angle * Math.PI) / 180;
                const x = Math.sin(rad) * 52;
                const y = -Math.cos(rad) * 52;
                return (
                  <div
                    key={`${letter}-${i}`}
                    className="absolute w-9 h-9 rounded-full border-2 border-neo-black bg-neo-white flex items-center justify-center font-neo-display font-bold text-sm text-neo-navy shadow-hard-sm"
                    style={{ transform: `translate(${x}px, ${y}px)` }}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleStart}
              className="px-8 py-3 rounded-neo border-3 border-neo-black bg-neo-lime text-neo-black font-neo-display font-black text-lg shadow-hard-lg hover:bg-neo-lime-light active:shadow-hard-pressed active:translate-x-px active:translate-y-px transition-all"
            >
              {t('daily.play')}
            </button>
          </motion.div>
        )}

        {/* Playing */}
        {phase === 'playing' && puzzle && (
          <motion.div
            key="playing"
            className="flex-1 flex flex-col items-center justify-center py-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <WordWheelGame
              puzzle={puzzle}
              duration={WORD_WHEEL_DURATION}
              onComplete={handleComplete}
              onValidateWord={handleValidateWord}
            />
          </motion.div>
        )}

        {/* Completed / Already Played */}
        {(phase === 'completed' || phase === 'already-played') && gameResult && (
          <motion.div
            key="results"
            className="flex-1 flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <WordWheelResults
              result={gameResult}
              puzzleNumber={puzzleNumber}
              hasPlayedWordHunt={hasPlayedWH}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WordWheelChallenge;
