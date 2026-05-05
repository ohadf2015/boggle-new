'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import PracticeChainCta from './PracticeChainCta';
import PracticeCompleteBanner from './PracticeCompleteBanner';
import PracticeMascotReaction, { type PracticeMascotMood } from './PracticeMascotReaction';
import PracticeModeNav from './PracticeModeNav';
import PracticeMicroTip from './PracticeMicroTip';
import PracticePixiFx, { type PracticePixiFxHandle } from './PracticePixiFx';
import { usePracticeWheelDragSelect } from './usePracticeWheelDragSelect';
import { usePracticeJuice } from './usePracticeJuice';
import { usePracticeValidator } from '@/lib/practice/usePracticeValidator';
import { createMicroTutorial, type MicroTutorialBeat } from '@/lib/practice/microTutorial';
import { markPracticeMode, PRACTICE_GOALS } from '@/lib/practice/practiceProgress';
import {
  trackPracticeStarted,
  trackPracticeWordFound,
  trackPracticeCompleted,
} from '@/lib/practice/telemetry';
import { getPracticeStreak } from '@/hooks/usePracticeStreak';

interface WheelPuzzle {
  /** Letter at the center — must appear in every accepted word. */
  center: string;
  /** Outer ring letters, top → right → bottom → left. */
  outer: string[];
}

const PUZZLES: Record<string, WheelPuzzle> = {
  en: { center: 'A', outer: ['T', 'R', 'C', 'E'] },
  he: { center: 'א', outer: ['ב', 'ם', 'מ', 'ה'] },
  sv: { center: 'A', outer: ['T', 'R', 'K', 'E'] },
  ja: { center: 'い', outer: ['ぬ', 'と', 'け', 'ま'] },
  es: { center: 'A', outer: ['C', 'S', 'M', 'E'] },
};

/**
 * Wheel-rush practice sandbox (redesigned 2026-05-05).
 *
 * Mirrors real wheel-rush mechanic: drag-spell using a center-letter-required
 * constraint. Real dictionary validation via /api/validate-word. No submit/
 * reset buttons (drag-release auto-submits, pointer-down auto-clears). Goal:
 * find 3 valid words.
 *
 * Letter index 0 = center, indices 1..N = outer (top→right→bottom→left).
 */
export default function PracticeWheelSandbox() {
  const { language } = useLanguage();
  const puzzle = PUZZLES[language] ?? PUZZLES.en;
  const allLetters = useMemo(() => [puzzle.center, ...puzzle.outer], [puzzle]);

  const validator = usePracticeValidator(language);
  const juice = usePracticeJuice();
  const fxRef = useRef<PracticePixiFxHandle | null>(null);
  const tutorialRef = useRef(createMicroTutorial({ mode: 'wheelRush' }));
  const [beat, setBeat] = useState<MicroTutorialBeat>(tutorialRef.current.currentBeat());
  const advanceBeat = useCallback(() => setBeat(tutorialRef.current.currentBeat()), []);

  const wheel = usePracticeWheelDragSelect({ letters: allLetters });
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'ok' | 'bad' | 'dup' | 'noCenter' | null>(null);

  const startedAtRef = useRef(0);
  const completedFiredRef = useRef(false);
  const isComplete = foundWords.length >= PRACTICE_GOALS.wheelRush;

  useEffect(() => {
    startedAtRef.current = Date.now();
    trackPracticeStarted({ mode: 'wheelRush', locale: language });
  }, [language]);

  useEffect(() => {
    if (isComplete && !completedFiredRef.current) {
      completedFiredRef.current = true;
      markPracticeMode('wheelRush', language);
      trackPracticeCompleted({
        mode: 'wheelRush',
        locale: language,
        wordsFound: foundWords.length,
        durationSeconds: Math.round((Date.now() - startedAtRef.current) / 1000),
        streakDay: getPracticeStreak().current,
      });
      tutorialRef.current.dispatch({ type: 'goal-reached', count: foundWords.length });
      advanceBeat();
    }
  }, [isComplete, foundWords.length, language, advanceBeat]);

  const onLetterPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>, idx: number) => {
      e.preventDefault();
      try { (e.target as Element).releasePointerCapture?.(e.pointerId); } catch { /* ignore */ }
      wheel.clear();
      setFeedback(null);
      wheel.onLetterEnter(idx);
      tutorialRef.current.dispatch({ type: 'drag-started' });
      advanceBeat();
    },
    [wheel, advanceBeat],
  );

  const onLetterPointerEnter = useCallback(
    (idx: number) => {
      wheel.onLetterEnter(idx);
    },
    [wheel],
  );

  const onContainerPointerUp = useCallback(async () => {
    const word = wheel.word();
    if (word.length < 2) {
      wheel.clear();
      return;
    }
    if (!word.includes(puzzle.center)) {
      setFeedback('noCenter');
      wheel.clear();
      return;
    }
    if (foundWords.includes(word)) {
      setFeedback('dup');
      wheel.clear();
      return;
    }
    const result = await validator.check(word);
    if (result.isValid) {
      setFoundWords((prev) => {
        const next = [...prev, word];
        trackPracticeWordFound({ mode: 'wheelRush', locale: language, word, wordsFound: next.length });
        return next;
      });
      setFeedback('ok');
      const tilePositions = wheel.path.map((i) => {
        const el = document.querySelector(`[data-testid="practice-letter-${i}"]`) as Element | null;
        const rect = el?.getBoundingClientRect();
        return { x: rect?.left ?? 0, y: rect?.top ?? 0, el: el ?? document.createElement('div') };
      });
      juice.triggerWordFound(tilePositions);
      tutorialRef.current.dispatch({ type: 'word-found' });
      advanceBeat();
    } else {
      setFeedback('bad');
      const tile = document.querySelector(`[data-testid="practice-letter-${wheel.path[0]}"]`);
      if (tile) juice.triggerInvalid(tile);
    }
    wheel.clear();
  }, [wheel, puzzle.center, foundWords, validator, juice, language, advanceBeat]);

  const currentWord = useMemo(() => wheel.word(), [wheel]);
  const selectedSet = useMemo(() => new Set(wheel.path), [wheel.path]);

  const mascotReaction: PracticeMascotMood = isComplete
    ? 'celebrate'
    : feedback === 'ok'
      ? 'cheer'
      : feedback === 'bad' || feedback === 'noCenter'
        ? 'wrong'
        : 'idle';

  const RADIUS = 70;

  return (
    <div
      className="relative flex flex-col items-center w-full max-w-md mx-auto px-4 pt-4 pb-bottom-stack gap-3"
      onPointerUp={onContainerPointerUp}
      onPointerLeave={onContainerPointerUp}
    >
      <PracticePixiFx ref={fxRef} />
      <PracticeMascotReaction mode="wheelRush" reaction={mascotReaction} />
      <PracticeModeNav current="wheelRush" />

      <div
        data-testid="practice-goal-indicator"
        className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-neo-purple/20 border border-neo-purple text-neo-cream text-xs font-neo-display font-black"
      >
        {foundWords.length}/{PRACTICE_GOALS.wheelRush}
      </div>

      <PracticeMicroTip
        beat={beat}
        onDismiss={() => {
          tutorialRef.current.dispatch({ type: 'beat-completed' });
          advanceBeat();
        }}
      />

      <div data-testid="practice-wheel" className="relative w-48 h-48 touch-none">
        {/* Center letter (index 0) */}
        <button
          type="button"
          data-testid="practice-letter-0"
          onPointerDown={(e) => onLetterPointerDown(e, 0)}
          onPointerEnter={() => onLetterPointerEnter(0)}
          className={
            'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full border-2 border-neo-black font-neo-display font-black text-2xl shadow-hard-sm transition-transform ' +
            (selectedSet.has(0)
              ? 'bg-neo-lime text-neo-black scale-95'
              : 'bg-neo-cyan text-neo-black')
          }
        >
          {puzzle.center}
        </button>
        {/* Outer letters (indices 1..N) */}
        {puzzle.outer.map((letter, i) => {
          const idx = i + 1;
          const angle = i * 90;
          return (
            <button
              key={`${letter}-${i}`}
              type="button"
              data-testid={`practice-letter-${idx}`}
              onPointerDown={(e) => onLetterPointerDown(e, idx)}
              onPointerEnter={() => onLetterPointerEnter(idx)}
              style={{
                transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${RADIUS}px) rotate(${-angle}deg)`,
              }}
              className={
                'absolute top-1/2 left-1/2 w-12 h-12 rounded-neo border-2 border-neo-black font-neo-display font-black text-xl shadow-hard-sm transition-transform ' +
                (selectedSet.has(idx)
                  ? 'bg-neo-lime text-neo-black scale-95'
                  : 'bg-neo-cream text-neo-black')
              }
            >
              {letter}
            </button>
          );
        })}
      </div>

      <div
        data-testid="practice-current-word"
        className="min-h-[2rem] font-neo-display font-black text-xl text-neo-cream tracking-wider"
      >
        {currentWord}
      </div>

      <ul className="flex flex-wrap gap-1.5 min-h-[1.5rem] w-full">
        {foundWords.map((w) => (
          <li key={w} className="px-2 py-0.5 bg-neo-purple/20 border border-neo-purple/40 rounded text-neo-purple text-xs font-neo-display font-bold">
            {w}
          </li>
        ))}
      </ul>

      {isComplete && <PracticeCompleteBanner mode="wheelRush" />}
      {isComplete && (
        <PracticeChainCta
          currentMode="wheelRush"
          className="mt-2 inline-flex items-center justify-center w-full bg-neo-purple text-neo-cream border-3 border-neo-black rounded-neo py-3 px-4 font-neo-display font-black text-base shadow-hard active:shadow-hard-pressed"
        />
      )}
    </div>
  );
}
