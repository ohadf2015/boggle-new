'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
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
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useAuth } from '@/contexts/AuthContext';
import { getGuestFingerprint } from '@/utils/guestManager';
import type { WordWheelEffect } from './WordWheelEffectsCanvas';

// Lazy-load PixiJS effects canvas (no SSR)
const WordWheelEffectsCanvas = dynamic(
  () => import('./WordWheelEffectsCanvas'),
  { ssr: false },
);

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
  const { setGameActive } = useSoundEffects();
  const { profile, isAuthenticated } = useAuth();

  const [phase, setPhase] = useState<WordWheelPhase>('loading');
  const [puzzle, setPuzzle] = useState<WordWheelPuzzle | null>(null);
  const [gameResult, setGameResult] = useState<WordWheelGameResult | null>(null);
  const [puzzleNumber, setPuzzleNumber] = useState(0);
  const [hasPlayedWH, setHasPlayedWH] = useState(false);
  const [effects, setEffects] = useState<WordWheelEffect[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 600 });

  const containerRef = useRef<HTMLDivElement>(null);

  // Measure container for effects canvas
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Initialize puzzle
  useEffect(() => {
    const date = getDailyChallengeDate();
    const number = getPuzzleNumber(date);
    setPuzzleNumber(number);

    const gameLang = language as Language;

    if (hasPlayedWordWheelToday(gameLang)) {
      const stored = getTodaysWordWheelResult(gameLang);
      if (stored) {
        setGameResult({
          wordsFound: stored.result.wordsFound,
          score: stored.result.score,
          timeSeconds: stored.result.timeSeconds,
        });
        setPhase('already-played');
      } else {
        // Played but result corrupted/missing — show fallback result
        setGameResult({ wordsFound: [], score: 0, timeSeconds: 0 });
        setPhase('already-played');
      }
    } else {
      const generatedPuzzle = generateWordWheelPuzzle(date, gameLang);
      setPuzzle(generatedPuzzle);
      setPhase('ready');
    }

    setHasPlayedWH(hasPlayedWordHuntToday(gameLang));
  }, [language]);

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
      return word.length >= 3;
    }
  }, [language]);

  const handleStart = useCallback(() => {
    setGameActive(true);
    setPhase('playing');
  }, [setGameActive]);

  const handleComplete = useCallback((result: WordWheelGameResult) => {
    setGameActive(false);
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
      totalPossible: 0,
      score: result.score,
      timeSeconds: result.timeSeconds,
      streakDays: streak.currentStreak,
      completedAt: new Date().toISOString(),
    });

    // Submit to server for leaderboard
    const longestWord = result.wordsFound.reduce((a, b) => b.length > a.length ? b : a, '');
    const submitBody = {
      puzzleDate: date,
      puzzleNumber,
      language: gameLang,
      playerId: isAuthenticated && profile ? profile.id : undefined,
      guestFingerprint: !isAuthenticated ? (getGuestFingerprint() || undefined) : undefined,
      displayName: profile?.display_name || 'Guest',
      avatarEmoji: profile?.avatar_emoji || '🎯',
      avatarColor: profile?.avatar_color || '#6366f1',
      avatarImage: profile?.avatar_image || undefined,
      countryCode: profile?.country_code || undefined,
      score: result.score,
      wordCount: result.wordsFound.length,
      wordsFound: result.wordsFound,
      longestWord: longestWord || undefined,
      timeSeconds: result.timeSeconds,
      centerLetter: puzzle?.centerLetter || undefined,
    };

    fetch('/api/daily-challenge/word-wheel/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submitBody),
    }).catch(() => { /* leaderboard submission is best-effort */ });

    setPhase('completed');
  }, [language, puzzle, puzzleNumber, setGameActive, isAuthenticated, profile]);

  const handleEffect = useCallback((effect: WordWheelEffect) => {
    setEffects(prev => [...prev, effect]);
  }, []);

  const handleEffectsConsumed = useCallback(() => {
    setEffects([]);
  }, []);

  // ==========================================
  // Render
  // ==========================================

  if (phase === 'loading') {
    return (
      <div className="flex-1 flex items-center justify-center bg-neo-navy">
        <PageLoader size="lg" text="Loading Word Wheel..." />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative flex-1 flex flex-col bg-neo-navy min-h-0 overflow-hidden">
      {/* PixiJS Effects Layer */}
      {phase === 'playing' && (
        <WordWheelEffectsCanvas
          width={canvasSize.width}
          height={canvasSize.height}
          effects={effects}
          onEffectsConsumed={handleEffectsConsumed}
        />
      )}

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

            {/* Instruction cards */}
            <div className="flex flex-col gap-2 max-w-xs w-full">
              <div className="flex items-center gap-3 px-3 py-2 rounded-neo border-2 border-neo-black bg-neo-navy-light">
                <span className="text-neo-lime text-lg">⭐</span>
                <span className="text-neo-cream/80 text-sm">{t('wordWheel.centerLetterRule')}</span>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 rounded-neo border-2 border-neo-black bg-neo-navy-light">
                <span className="text-neo-cyan text-lg">🔤</span>
                <span className="text-neo-cream/80 text-sm">{t('wordWheel.minLetters').replace('{min}', '3')}</span>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 rounded-neo border-2 border-neo-black bg-neo-navy-light">
                <span className="text-neo-pink text-lg">⏱</span>
                <span className="text-neo-cream/80 text-sm">{t('wordWheel.timeLimit')}</span>
              </div>
            </div>

            {/* Preview wheel */}
            <div className="relative w-44 h-44 flex items-center justify-center my-4">
              {/* Glow ring */}
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-neo-lime/20"
                style={{ boxShadow: '0 0 30px rgba(191,255,0,0.15)' }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="w-16 h-16 rounded-full border-3 border-neo-black bg-neo-lime flex items-center justify-center font-neo-display font-black text-2xl text-neo-black shadow-[3px_3px_0px_black,0_0_20px_rgba(191,255,0,0.5)]"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                {puzzle.centerLetter}
              </motion.div>
              {puzzle.outerLetters.map((letter, i) => {
                const angle = i * 45;
                const rad = (angle * Math.PI) / 180;
                const x = Math.sin(rad) * 60;
                const y = -Math.cos(rad) * 60;
                return (
                  <motion.div
                    key={`${letter}-${i}`}
                    className="absolute w-10 h-10 rounded-full border-2 border-neo-black bg-neo-white flex items-center justify-center font-neo-display font-bold text-sm text-neo-navy shadow-[2px_2px_0px_black,0_0_6px_rgba(191,255,0,0.12)]"
                    style={{ transform: `translate(${x}px, ${y}px)` }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.06, type: 'spring', stiffness: 400 }}
                  >
                    {letter}
                  </motion.div>
                );
              })}
            </div>

            <motion.button
              type="button"
              onClick={handleStart}
              className="px-8 py-3 rounded-neo border-3 border-neo-black bg-gradient-to-r from-neo-lime to-neo-cyan text-neo-black font-neo-display font-black text-lg shadow-[3px_3px_0px_black,0_0_16px_rgba(191,255,0,0.3)] hover:shadow-[3px_3px_0px_black,0_0_22px_rgba(0,255,255,0.4)] active:shadow-hard-pressed active:translate-x-px active:translate-y-px transition-all"
              whileTap={{ scale: 0.95 }}
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              {t('daily.play')}
            </motion.button>
          </motion.div>
        )}

        {/* Playing */}
        {phase === 'playing' && puzzle && (
          <motion.div
            key="playing"
            className="flex-1 flex flex-col items-center justify-start pt-3 sm:pt-4 pb-4 relative z-20 overflow-y-auto overscroll-contain"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <WordWheelGame
              puzzle={puzzle}
              duration={WORD_WHEEL_DURATION}
              onComplete={handleComplete}
              onValidateWord={handleValidateWord}
              onEffect={handleEffect}
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
              puzzleDate={getDailyChallengeDate()}
              language={language as Language}
              hasPlayedWordHunt={hasPlayedWH}
              currentPlayerId={isAuthenticated && profile ? profile.id : null}
              currentGuestFingerprint={!isAuthenticated ? (getGuestFingerprint() || null) : null}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WordWheelChallenge;
