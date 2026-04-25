'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AnimatePresence, m } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useAuth } from '@/contexts/AuthContext';
import { getPuzzleForLevel, getTotalLevels } from '@/lib/connections/puzzles';
import {
  initGameState,
  applyGuess,
  advancePuzzle,
  giveUp as giveUpLogic,
  revive as reviveLogic,
  revealHint as revealHintLogic,
  markRated,
  xpForPuzzle,
} from '@/lib/connections/gameLogic';
import { getCurrentLevel, setCurrentLevel } from '@/lib/connections/levelStore';
import type { ConnectionPuzzle, GameState, PuzzleRating } from '@/lib/connections/types';
import { submitConnectionsFeedback } from '@/lib/connections/feedback';
import PuzzleCard from './PuzzleCard';
import OutOfLivesModal from './OutOfLivesModal';

const ConnectionsEffectsCanvas = dynamic(() => import('./ConnectionsEffectsCanvas'), { ssr: false });

const ADVANCE_DELAY_MS = 1200;

type Action =
  | { type: 'SET_INPUT'; input: string }
  | { type: 'SUBMIT' }
  | { type: 'ADVANCE' }
  | { type: 'GIVE_UP' }
  | { type: 'REVIVE' }
  | { type: 'REVEAL_HINT' }
  | { type: 'MARK_RATED'; puzzleId: string }
  | { type: 'RESET'; puzzles: ConnectionPuzzle[] };

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SET_INPUT':
      return { ...state, input: action.input };
    case 'SUBMIT':
      if (!state.input.trim() || state.status === 'correct' || state.status === 'gaveUp' || state.status === 'finished' || state.status === 'outOfLives') {
        return state;
      }
      return applyGuess(state, state.input);
    case 'GIVE_UP':
      return giveUpLogic(state);
    case 'REVIVE':
      return reviveLogic(state);
    case 'REVEAL_HINT':
      return revealHintLogic(state);
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
  const { isAdmin } = useAuth();
  const router = useRouter();
  const isRTL = language === 'he';
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Each level renders one puzzle. Level number persists in localStorage per locale.
  const [level, setLevel] = useState<number>(() => getCurrentLevel(language));
  const totalLevels = getTotalLevels(language);
  const initialPuzzle = getPuzzleForLevel(language, level);
  const initialPuzzles: ConnectionPuzzle[] = initialPuzzle ? [initialPuzzle] : [];

  const [state, dispatch] = useReducer(reducer, initialPuzzles, initGameState);
  const [sessionScore, setSessionScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const xpAwardedIdsRef = useRef<Set<string>>(new Set());

  const setIsInGame = useHideNavigation();
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

  // If locale changes mid-session, reload from that locale's saved level.
  useEffect(() => {
    const newLevel = getCurrentLevel(language);
    setLevel(newLevel);
    const puzzle = getPuzzleForLevel(language, newLevel);
    dispatch({ type: 'RESET', puzzles: puzzle ? [puzzle] : [] });
    xpAwardedIdsRef.current = new Set();
  }, [language]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setCanvasSize({ width: Math.floor(width), height: Math.floor(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // After correct → award XP + accumulate score, then auto-advance to next level
  useEffect(() => {
    if (state.status !== 'correct') return;
    window.dispatchEvent(new CustomEvent('connections:correct'));
    const puzzle = state.puzzles[state.currentIndex];
    if (puzzle && !xpAwardedIdsRef.current.has(puzzle.id)) {
      xpAwardedIdsRef.current.add(puzzle.id);
      const xp = xpForPuzzle(puzzle.difficulty, state.streak);
      setXpEarned((prev) => prev + xp);
      setSessionScore((prev) => prev + state.score);
      void fetch('/api/education/record-xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xpAmount: xp, lessonId: 'connections-game', activityType: 'connections' }),
      }).catch(() => {});
    }
    const timer = setTimeout(() => advanceToNextLevel(), ADVANCE_DELAY_MS);
    return () => clearTimeout(timer);
    // advanceToNextLevel referenced via closure below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, state.currentIndex, state.puzzles, state.streak, state.score]);

  useEffect(() => {
    if (state.status === 'wrong') {
      window.dispatchEvent(new CustomEvent('connections:wrong'));
    }
  }, [state.status, state.wrongAttempts]);

  const advanceToNextLevel = useCallback(() => {
    const nextLevel = level + 1;
    setCurrentLevel(language, nextLevel);
    setLevel(nextLevel);
    const puzzle = getPuzzleForLevel(language, nextLevel);
    if (puzzle) {
      dispatch({ type: 'RESET', puzzles: [puzzle] });
    }
  }, [language, level]);

  const handleInput = useCallback((value: string) => {
    dispatch({ type: 'SET_INPUT', input: value });
  }, []);

  const handleSubmit = useCallback(() => {
    dispatch({ type: 'SUBMIT' });
  }, []);

  const handleGiveUp = useCallback(() => {
    dispatch({ type: 'GIVE_UP' });
  }, []);

  const handleRevealHint = useCallback(() => {
    dispatch({ type: 'REVEAL_HINT' });
  }, []);

  const handleRevive = useCallback(() => {
    dispatch({ type: 'REVIVE' });
  }, []);

  const handleQuit = useCallback(() => {
    router.push(`/${language}`);
  }, [router, language]);

  const handleAdvance = useCallback(() => {
    advanceToNextLevel();
  }, [advanceToNextLevel]);

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

  if (!currentPuzzle) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-neo-white/50 font-neo-body text-center px-4">{t('connections.noAccess')}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative flex flex-col gap-6 w-full max-w-xl mx-auto py-6 px-4">
      <ConnectionsEffectsCanvas width={canvasSize.width} height={canvasSize.height} />

      {/* Header: lives + level + score */}
      <m.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring' as const, stiffness: 280, damping: 24, delay: 0.1 }}
        className="flex items-center justify-between"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="flex items-center gap-2" aria-label={t('connections.lives')}>
          {Array.from({ length: 3 }).map((_, i) => {
            const alive = i < state.lives;
            return (
              <m.span
                key={`life-${i}`}
                animate={alive ? { scale: 1, opacity: 1, filter: 'grayscale(0)' } : { scale: 0.7, opacity: 0.25, filter: 'grayscale(1)' }}
                transition={{ type: 'spring' as const, stiffness: 400, damping: 18 }}
                className="text-2xl select-none"
              >
                ❤️
              </m.span>
            );
          })}
        </div>

        <div className="text-center">
          <p className="text-neo-white/40 text-[10px] uppercase tracking-widest font-mono">
            {t('connections.level')}
          </p>
          <p className="font-neo-display text-xl text-neo-cyan font-bold leading-none">
            {level}
            <span className="text-neo-white/30 text-sm font-mono"> / {totalLevels}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 text-sm font-neo-body">
          <AnimatePresence>
            {state.streak >= 2 && (
              <m.span
                key={`streak-${state.streak}`}
                initial={{ scale: 0.5, opacity: 0, y: -8 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring' as const, stiffness: 400, damping: 16 }}
                className="text-neo-orange font-bold"
              >
                🔥 ×{state.streak}
              </m.span>
            )}
          </AnimatePresence>
          <span className="text-neo-white/60">
            <AnimatePresence mode="popLayout">
              <m.span
                key={sessionScore + state.score}
                initial={{ y: -14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 14, opacity: 0 }}
                transition={{ type: 'spring' as const, stiffness: 380, damping: 22 }}
                className="text-neo-cyan font-bold inline-block"
              >
                {(sessionScore + state.score).toLocaleString()}
              </m.span>
            </AnimatePresence>
          </span>
        </div>
      </m.div>

      {/* XP earned this session */}
      {xpEarned > 0 && (
        <p className="text-center text-neo-lime text-xs font-neo-body">
          +{xpEarned} {t('connections.xpEarned')}
        </p>
      )}

      <PuzzleCard
        puzzle={currentPuzzle}
        state={state}
        isAdmin={isAdmin}
        onInputChange={handleInput}
        onSubmit={handleSubmit}
        onGiveUp={handleGiveUp}
        onRevealHint={handleRevealHint}
        onRate={handleRate}
        onNext={handleAdvance}
      />

      <OutOfLivesModal
        open={state.status === 'outOfLives'}
        isAdmin={isAdmin}
        level={level}
        onRevive={handleRevive}
        onQuit={handleQuit}
      />
    </div>
  );
}
