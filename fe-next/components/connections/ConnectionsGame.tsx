'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/contexts/LanguageContext';
import { getShuffledPuzzles } from '@/lib/connections/puzzles';
import { initGameState, applyGuess, advancePuzzle } from '@/lib/connections/gameLogic';
import type { GameState } from '@/lib/connections/types';
import PuzzleCard from './PuzzleCard';

const ConnectionsEffectsCanvas = dynamic(() => import('./ConnectionsEffectsCanvas'), { ssr: false });

const PUZZLE_COUNT = 20;
const ADVANCE_DELAY_MS = 1200;

type Action =
  | { type: 'SET_INPUT'; input: string }
  | { type: 'SUBMIT' }
  | { type: 'ADVANCE' }
  | { type: 'RESET'; puzzles: GameState['puzzles'] };

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SET_INPUT':
      return { ...state, input: action.input };
    case 'SUBMIT':
      if (!state.input.trim() || state.status === 'correct' || state.status === 'finished') return state;
      return applyGuess(state, state.input);
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

  // Auto-advance after correct answer
  useEffect(() => {
    if (state.status !== 'correct') return;
    window.dispatchEvent(new CustomEvent('connections:correct'));
    const timer = setTimeout(() => dispatch({ type: 'ADVANCE' }), ADVANCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state.status, state.currentIndex]);

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
  }, [language]);

  const currentPuzzle = state.puzzles[state.currentIndex];
  const progress = Math.round((state.completedIds.size / state.puzzles.length) * 100);

  if (state.status === 'finished') {
    return (
      <div className="flex flex-col items-center justify-center gap-8 py-12" dir={isRTL ? 'rtl' : 'ltr'}>
        <h2 className="font-neo-display text-4xl text-neo-lime">{t('connections.finished')}</h2>
        <div className="text-center">
          <p className="text-neo-white/60 text-sm uppercase tracking-widest mb-2">{t('connections.finalScore')}</p>
          <p className="font-neo-display text-6xl text-neo-yellow">{state.score.toLocaleString()}</p>
        </div>
        <button
          onClick={handleReset}
          className="rounded-neo border-neo-thick border-neo-lime bg-neo-lime text-neo-navy font-neo-display font-bold px-8 py-4 text-xl shadow-hard hover:shadow-hard-pressed active:translate-y-0.5 transition-all"
        >
          {t('connections.playAgain')}
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative flex flex-col gap-6 w-full max-w-xl mx-auto py-6 px-4">
      <ConnectionsEffectsCanvas width={canvasSize.width} height={canvasSize.height} />

      {/* Header stats */}
      <div className="flex items-center justify-between" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className={`text-2xl transition-all ${i < state.lives ? 'opacity-100' : 'opacity-20 grayscale'}`}>
              ❤️
            </span>
          ))}
        </div>

        <div className="flex items-center gap-4 text-sm font-neo-body">
          {state.streak >= 2 && (
            <span className="text-neo-orange font-bold animate-neo-pop">
              🔥 ×{state.streak}
            </span>
          )}
          <span className="text-neo-white/60">
            {t('connections.score')}: <span className="text-neo-cyan font-bold">{state.score.toLocaleString()}</span>
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-neo-navy-light rounded-full overflow-hidden">
        <div
          className="h-full bg-neo-lime transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Puzzle counter */}
      <p className="text-neo-white/40 text-xs text-center font-mono">
        {state.currentIndex + 1} / {state.puzzles.length}
      </p>

      {currentPuzzle && (
        <PuzzleCard
          puzzle={currentPuzzle}
          state={state}
          onInputChange={handleInput}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
