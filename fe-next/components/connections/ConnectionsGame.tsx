'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { getShuffledPuzzles } from '@/lib/connections/puzzles';
import { initGameState, applyGuess, advancePuzzle, giveUp as giveUpLogic, markRated, xpForPuzzle } from '@/lib/connections/gameLogic';
import type { GameState, PuzzleRating } from '@/lib/connections/types';
import { submitConnectionsFeedback } from '@/lib/connections/feedback';
import PuzzleCard from './PuzzleCard';

const ConnectionsEffectsCanvas = dynamic(() => import('./ConnectionsEffectsCanvas'), { ssr: false });

const PUZZLE_COUNT = 20;
const ADVANCE_DELAY_MS = 1200;

type Action =
  | { type: 'SET_INPUT'; input: string }
  | { type: 'SUBMIT' }
  | { type: 'ADVANCE' }
  | { type: 'GIVE_UP' }
  | { type: 'MARK_RATED'; puzzleId: string }
  | { type: 'RESET'; puzzles: GameState['puzzles'] };

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SET_INPUT':
      return { ...state, input: action.input };
    case 'SUBMIT':
      if (!state.input.trim() || state.status === 'correct' || state.status === 'gaveUp' || state.status === 'finished') return state;
      return applyGuess(state, state.input);
    case 'GIVE_UP':
      return giveUpLogic(state);
    case 'MARK_RATED':
      return markRated(state, action.puzzleId);
    case 'ADVANCE':
      return advancePuzzle(state);
    case 'RESET':
      return initGameState(action.puzzles);
    default:
      return state;
  }
}

export default function ConnectionsGame() {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const puzzles = getShuffledPuzzles(language, PUZZLE_COUNT);
  const [state, dispatch] = useReducer(reducer, puzzles, initGameState);
  const [xpEarned, setXpEarned] = useState(0);
  const xpAwardedIdsRef = useRef<Set<string>>(new Set());

  // Track container dimensions for the PixiJS canvas overlay
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setCanvasSize({ width: Math.floor(width), height: Math.floor(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Auto-advance after correct answer + award XP
  useEffect(() => {
    if (state.status !== 'correct') return;
    window.dispatchEvent(new CustomEvent('connections:correct'));
    const puzzle = state.puzzles[state.currentIndex];
    if (puzzle && !xpAwardedIdsRef.current.has(puzzle.id)) {
      xpAwardedIdsRef.current.add(puzzle.id);
      const xp = xpForPuzzle(puzzle.difficulty, state.streak);
      setXpEarned((prev) => prev + xp);
      void fetch('/api/education/record-xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xpAmount: xp, lessonId: 'connections-game', activityType: 'connections' }),
      }).catch(() => {});
    }
    const timer = setTimeout(() => dispatch({ type: 'ADVANCE' }), ADVANCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state.status, state.currentIndex, state.puzzles, state.streak]);

  // Dispatch wrong event
  useEffect(() => {
    if (state.status === 'wrong' || state.status === 'hint') {
      window.dispatchEvent(new CustomEvent('connections:wrong'));
    }
  }, [state.status, state.wrongAttempts]);

  const handleInput = useCallback((value: string) => {
    dispatch({ type: 'SET_INPUT', input: value });
  }, []);

  const handleSubmit = useCallback(() => {
    dispatch({ type: 'SUBMIT' });
  }, []);

  const handleReset = useCallback(() => {
    const fresh = getShuffledPuzzles(language, PUZZLE_COUNT);
    dispatch({ type: 'RESET', puzzles: fresh });
    setXpEarned(0);
    xpAwardedIdsRef.current = new Set();
  }, [language]);

  const handleGiveUp = useCallback(() => {
    dispatch({ type: 'GIVE_UP' });
  }, []);

  const handleAdvance = useCallback(() => {
    dispatch({ type: 'ADVANCE' });
  }, []);

  const handleRate = useCallback(
    (rating: PuzzleRating) => {
      const puzzle = state.puzzles[state.currentIndex];
      if (!puzzle || state.ratedIds.has(puzzle.id)) return;
      dispatch({ type: 'MARK_RATED', puzzleId: puzzle.id });
      void submitConnectionsFeedback({
        puzzleId: puzzle.id,
        locale: language,
        rating,
        gaveUp: state.status === 'gaveUp',
      });
    },
    [state.puzzles, state.currentIndex, state.ratedIds, state.status, language]
  );

  const currentPuzzle = state.puzzles[state.currentIndex];
  const progress = Math.round((state.completedIds.size / state.puzzles.length) * 100);

  if (state.status === 'finished') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring' as const, stiffness: 260, damping: 22 }}
        className="flex flex-col items-center justify-center gap-8 py-12"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <motion.h2
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring' as const, stiffness: 300, damping: 20 }}
          className="font-neo-display text-4xl text-neo-lime"
        >
          {t('connections.finished')}
        </motion.h2>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring' as const, stiffness: 280, damping: 22 }}
          className="text-center"
        >
          <p className="text-neo-white/60 text-sm uppercase tracking-widest mb-2">{t('connections.finalScore')}</p>
          <p className="font-neo-display text-6xl text-neo-yellow">{state.score.toLocaleString()}</p>
          {xpEarned > 0 && (
            <p className="mt-4 font-neo-body text-neo-lime text-lg">
              +{xpEarned} {t('connections.xpEarned')}
            </p>
          )}
        </motion.div>
        <motion.button
          onClick={handleReset}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.32, type: 'spring' as const, stiffness: 280, damping: 22 }}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.97, y: 1 }}
          className="rounded-neo border-neo-thick border-neo-lime bg-neo-lime text-neo-navy font-neo-display font-bold px-8 py-4 text-xl shadow-hard"
        >
          {t('connections.playAgain')}
        </motion.button>
      </motion.div>
    );
  }

  return (
    <div ref={containerRef} className="relative flex flex-col gap-6 w-full max-w-xl mx-auto py-6 px-4">
      <ConnectionsEffectsCanvas width={canvasSize.width} height={canvasSize.height} />

      {/* Header stats */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring' as const, stiffness: 280, damping: 24, delay: 0.1 }}
        className="flex items-center justify-between"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="flex items-center gap-2">
          {Array.from({ length: 3 }).map((_, i) => {
            const alive = i < state.lives;
            return (
              <motion.span
                key={i}
                animate={alive ? { scale: 1, opacity: 1, filter: 'grayscale(0)' } : { scale: 0.7, opacity: 0.25, filter: 'grayscale(1)' }}
                transition={{ type: 'spring' as const, stiffness: 400, damping: 18 }}
                className="text-2xl select-none"
              >
                ❤️
              </motion.span>
            );
          })}
        </div>

        <div className="flex items-center gap-4 text-sm font-neo-body">
          <AnimatePresence>
            {state.streak >= 2 && (
              <motion.span
                key={`streak-${state.streak}`}
                initial={{ scale: 0.5, opacity: 0, y: -8 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring' as const, stiffness: 400, damping: 16 }}
                className="text-neo-orange font-bold"
              >
                🔥 ×{state.streak}
              </motion.span>
            )}
          </AnimatePresence>
          <span className="text-neo-white/60">
            {t('connections.score')}:{' '}
            <AnimatePresence mode="popLayout">
              <motion.span
                key={state.score}
                initial={{ y: -14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 14, opacity: 0 }}
                transition={{ type: 'spring' as const, stiffness: 380, damping: 22 }}
                className="text-neo-cyan font-bold inline-block"
              >
                {state.score.toLocaleString()}
              </motion.span>
            </AnimatePresence>
          </span>
        </div>
      </motion.div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-neo-navy-light rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-neo-lime"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring' as const, stiffness: 180, damping: 28 }}
        />
      </div>

      {/* Puzzle counter */}
      <p className="text-neo-white/40 text-xs text-center font-mono" dir="ltr">
        {state.currentIndex + 1} / {state.puzzles.length}
      </p>

      {currentPuzzle && (
        <PuzzleCard
          puzzle={currentPuzzle}
          state={state}
          onInputChange={handleInput}
          onSubmit={handleSubmit}
          onGiveUp={handleGiveUp}
          onRate={handleRate}
          onNext={handleAdvance}
        />
      )}
    </div>
  );
}
