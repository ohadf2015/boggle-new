'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
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
import { getCurrentLives, setCurrentLives, MAX_LIVES } from '@/lib/connections/livesStore';
import type { ConnectionPuzzle, GameState, PuzzleRating } from '@/lib/connections/types';
import { submitConnectionsFeedback } from '@/lib/connections/feedback';
import { trackGameStart } from '@/utils/growthTracking';
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
  | { type: 'RESET'; puzzles: ConnectionPuzzle[]; initialLives?: number };

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
      return initGameState(action.puzzles, { initialLives: action.initialLives });
    default:
      return state;
  }
}

export default function ConnectionsGame() {
  const { t, language } = useLanguage();
  const { isAdmin } = useAuth();
  const router = useRouter();
  const isRTL = language === 'he';
  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Each level renders one puzzle. Level number + lives persist in localStorage per locale.
  const [level, setLevel] = useState<number>(() => getCurrentLevel(language));
  const totalLevels = getTotalLevels(language);
  const initialPuzzle = getPuzzleForLevel(language, level);
  const initialPuzzles: ConnectionPuzzle[] = initialPuzzle ? [initialPuzzle] : [];

  const [state, dispatch] = useReducer(
    reducer,
    initialPuzzles,
    (puzzles): GameState => initGameState(puzzles, { initialLives: getCurrentLives(language) })
  );
  const heartsRef = useRef<HTMLDivElement>(null);
  const levelBadgeRef = useRef<HTMLDivElement>(null);
  const prevLivesRef = useRef<number>(state.lives);
  const [sessionScore, setSessionScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const xpAwardedIdsRef = useRef<Set<string>>(new Set());

  // Funnel parity: emit growth:game_started once on mount. Was missing →
  // PostHog showed 18 connections mode_selected with 0 game_starts
  // (2026-04-27 sweep). One emit per session is enough; subsequent puzzles
  // within the same session are tracked via puzzle-level events.
  useEffect(() => {
    trackGameStart('connections', { language });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If locale changes mid-session, reload from that locale's saved level + lives.
  useEffect(() => {
    const newLevel = getCurrentLevel(language);
    setLevel(newLevel);
    const puzzle = getPuzzleForLevel(language, newLevel);
    dispatch({
      type: 'RESET',
      puzzles: puzzle ? [puzzle] : [],
      initialLives: getCurrentLives(language),
    });
    xpAwardedIdsRef.current = new Set();
  }, [language]);

  // Persist lives + emit lifeLost / gameOver events on changes.
  // Reduced-motion users still get state persistence but skip the
  // particle/flash/shake bursts (WCAG 2.3.3).
  useEffect(() => {
    const prev = prevLivesRef.current;
    if (state.lives !== prev) {
      setCurrentLives(language, state.lives);
      if (!prefersReducedMotion) {
        if (state.lives < prev) {
          const rect = heartsRef.current?.getBoundingClientRect();
          const containerRect = containerRef.current?.getBoundingClientRect();
          const x = rect && containerRect ? rect.left + rect.width / 2 - containerRect.left : 0;
          const y = rect && containerRect ? rect.top + rect.height / 2 - containerRect.top : 0;
          window.dispatchEvent(new CustomEvent('connections:lifeLost', { detail: { x, y } }));
        }
        if (state.lives === 0 && prev > 0) {
          window.dispatchEvent(new CustomEvent('connections:gameOver'));
        }
      }
      prevLivesRef.current = state.lives;
    }
  }, [state.lives, language, prefersReducedMotion]);

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
    if (!prefersReducedMotion) {
      window.dispatchEvent(new CustomEvent('connections:correct'));
    }
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
    if (state.status === 'wrong' && !prefersReducedMotion) {
      window.dispatchEvent(new CustomEvent('connections:wrong'));
    }
  }, [state.status, state.wrongAttempts, prefersReducedMotion]);

  const advanceToNextLevel = useCallback(() => {
    const nextLevel = level + 1;
    setCurrentLevel(language, nextLevel);
    setLevel(nextLevel);
    const puzzle = getPuzzleForLevel(language, nextLevel);
    if (puzzle) {
      // Carry surviving lives across levels so they actually gate progress.
      dispatch({ type: 'RESET', puzzles: [puzzle], initialLives: state.lives });
    }
    if (!prefersReducedMotion) {
      const rect = levelBadgeRef.current?.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();
      const x = rect && containerRect ? rect.left + rect.width / 2 - containerRect.left : 0;
      const y = rect && containerRect ? rect.top + rect.height / 2 - containerRect.top : 0;
      window.dispatchEvent(new CustomEvent('connections:levelUp', { detail: { x, y, level: nextLevel } }));
    }
  }, [language, level, state.lives, prefersReducedMotion]);

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

  // Distinguish "cleared whole pack" from "no puzzles for this locale".
  // getPuzzleForLevel returns null past the end → if the player has cleared
  // ≥1 level we treat this as terminal-success, otherwise as no-content.
  const handlePlayAgain = useCallback(() => {
    setCurrentLevel(language, 1);
    setLevel(1);
    const puzzle = getPuzzleForLevel(language, 1);
    dispatch({ type: 'RESET', puzzles: puzzle ? [puzzle] : [], initialLives: MAX_LIVES });
    setSessionScore(0);
    setXpEarned(0);
    xpAwardedIdsRef.current = new Set();
  }, [language]);

  if (!currentPuzzle) {
    const cleared = level > 1 && totalLevels > 0;
    if (cleared) {
      return (
        <div className="flex-1 flex items-center justify-center px-4 py-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            className="w-full max-w-sm rounded-neo border-neo-thick border-neo-lime bg-neo-navy-light shadow-hard-lg p-6 text-center"
          >
            <p className="text-5xl mb-3" aria-hidden="true">🏆</p>
            <h2 className="font-neo-display text-2xl text-neo-cream font-bold mb-2">
              {t('connections.finished')}
            </h2>
            <p className="text-neo-white/60 text-sm mb-4">
              {t('connections.subtitle')}
            </p>
            <div className="flex justify-around gap-3 mb-5 text-sm font-neo-body">
              <div className="flex flex-col">
                <span className="text-neo-cyan text-[10px] uppercase tracking-widest font-bold">{t('connections.finalScore')}</span>
                <span className="text-neo-cyan font-bold tabular-nums">{(sessionScore + state.score).toLocaleString()}</span>
              </div>
              {xpEarned > 0 && (
                <div className="flex flex-col">
                  <span className="text-neo-lime text-[10px] uppercase tracking-widest font-bold">{t('connections.xpEarned')}</span>
                  <span className="text-neo-lime font-bold tabular-nums">+{xpEarned}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <motion.button
                type="button"
                onClick={handlePlayAgain}
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                className="w-full rounded-neo border-neo-thick border-neo-lime bg-neo-lime text-neo-navy font-neo-display font-bold px-5 py-3 shadow-hard"
              >
                {t('connections.playAgain')}
              </motion.button>
              <button
                type="button"
                onClick={handleQuit}
                className="w-full rounded-neo border-neo border-neo-white/30 bg-transparent text-neo-white/70 font-neo-body text-sm px-5 py-2.5 hover:bg-neo-white/5 transition-colors"
              >
                {t('connections.quitToMenu')}
              </button>
            </div>
          </motion.div>
        </div>
      );
    }
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-neo-white/50 font-neo-body text-center px-4">{t('connections.noAccess')}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative flex flex-col gap-6 w-full max-w-xl mx-auto py-6 px-4">
      <ConnectionsEffectsCanvas width={canvasSize.width} height={canvasSize.height} />

      {/* Back to home */}
      <div className="flex" dir={isRTL ? 'rtl' : 'ltr'}>
        <button
          type="button"
          onClick={handleQuit}
          aria-label={t('common.back')}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-neo border-neo border-black bg-neo-navy-light text-neo-white shadow-hard-sm hover:shadow-hard active:shadow-hard-pressed active:translate-y-[1px] font-neo-body font-bold text-sm transition-all duration-100"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
          <span>{t('common.back')}</span>
        </button>
      </div>

      {/* Header: lives + level + score — sticky so HUD stays visible while scrolling / mobile keyboard up */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring' as const, stiffness: 280, damping: 24, delay: 0.1 }}
        className="sticky top-0 z-30 -mx-4 px-4 py-2 bg-neo-navy/90 backdrop-blur-sm border-b-2 border-neo-purple/40 flex items-center justify-between gap-3"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* LIVES — neo-brutalist hearts pill */}
        <div
          ref={heartsRef}
          className="flex flex-col items-start gap-1"
          aria-label={`${t('connections.lives')}: ${state.lives} / ${MAX_LIVES}`}
        >
          <p className="text-neo-pink text-[10px] uppercase tracking-widest font-neo-display font-bold leading-none">
            {t('connections.lives')}
          </p>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-neo-navy-light border-neo border-black rounded-neo shadow-hard">
            {Array.from({ length: MAX_LIVES }).map((_, i) => {
              const alive = i < state.lives;
              return (
                <motion.span
                  key={`life-${i}`}
                  animate={
                    alive
                      ? { scale: 1, opacity: 1, filter: 'grayscale(0) drop-shadow(0 0 4px rgba(255,20,147,0.6))' }
                      : { scale: 0.55, opacity: 0.18, filter: 'grayscale(1)' }
                  }
                  transition={{ type: 'spring' as const, stiffness: 420, damping: 16 }}
                  className="text-xl select-none leading-none"
                >
                  {alive ? '❤️' : '🖤'}
                </motion.span>
              );
            })}
          </div>
        </div>

        {/* LEVEL — neo-brutalist cyan badge */}
        <motion.div
          ref={levelBadgeRef}
          key={`level-${level}`}
          initial={{ scale: 0.8, rotate: -3 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring' as const, stiffness: 400, damping: 14 }}
          className="flex flex-col items-center gap-1"
        >
          <p className="text-neo-cyan text-[10px] uppercase tracking-widest font-neo-display font-bold leading-none">
            {t('connections.level')}
          </p>
          <div className="px-3 py-1 bg-neo-cyan border-neo border-black rounded-neo shadow-hard">
            <p className="font-neo-display text-2xl text-neo-navy font-black leading-none tabular-nums">
              {level}
              <span className="text-neo-navy/50 text-xs font-mono font-bold"> / {totalLevels}</span>
            </p>
          </div>
        </motion.div>

        <div className="flex flex-col items-end gap-1 text-sm font-neo-body min-w-0">
          <p className="text-neo-lime text-[10px] uppercase tracking-widest font-neo-display font-bold leading-none">
            {t('connections.score')}
          </p>
          <div className="flex items-center gap-2">
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
            <AnimatePresence mode="popLayout">
              <motion.span
                key={sessionScore + state.score}
                initial={{ y: -14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 14, opacity: 0 }}
                transition={{ type: 'spring' as const, stiffness: 380, damping: 22 }}
                className="text-neo-cyan font-bold inline-block"
              >
                {(sessionScore + state.score).toLocaleString()}
              </motion.span>
            </AnimatePresence>
          </span>
          </div>
        </div>
      </motion.div>

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
