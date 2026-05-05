'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import PracticeChainCta from './PracticeChainCta';
import PracticeCompleteBanner from './PracticeCompleteBanner';
import PracticeMascotReaction, { type PracticeMascotMood } from './PracticeMascotReaction';
import PracticeModeNav from './PracticeModeNav';
import PracticeMicroTip from './PracticeMicroTip';
import PracticePixiFx, { type PracticePixiFxHandle } from './PracticePixiFx';
import { usePracticeGridDragSelect } from './usePracticeGridDragSelect';
import { usePracticeJuice } from './usePracticeJuice';
import { usePracticeValidator } from '@/lib/practice/usePracticeValidator';
import { createMicroTutorial, type MicroTutorialBeat } from '@/lib/practice/microTutorial';
import { markPracticeMode } from '@/lib/practice/practiceProgress';
import {
  trackPracticeStarted,
  trackPracticeWordFound,
  trackPracticeCompleted,
} from '@/lib/practice/telemetry';
import { getPracticeStreak } from '@/hooks/usePracticeStreak';

const BOARDS: Record<string, string[][]> = {
  en: [['S', 'T', 'A', 'R'], ['E', 'O', 'N', 'I'], ['P', 'L', 'A', 'T'], ['E', 'R', 'I', 'N']],
  he: [['ש', 'ל', 'ו', 'ם'], ['ב', 'י', 'ת', 'א'], ['מ', 'ן', 'ר', 'ה'], ['ע', 'ק', 'ו', 'ל']],
  sv: [['S', 'T', 'A', 'R'], ['E', 'O', 'N', 'I'], ['P', 'L', 'A', 'T'], ['E', 'R', 'I', 'N']],
  ja: [['い', 'ぬ', 'か', 'み'], ['ね', 'こ', 'と', 'り'], ['さ', 'く', 'ら', 'ま'], ['は', 'な', 'ゆ', 'き']],
  es: [['C', 'A', 'S', 'A'], ['M', 'E', 'L', 'O'], ['T', 'I', 'A', 'R'], ['E', 'O', 'N', 'P']],
};

const TARGETS: Record<string, string> = {
  en: 'STAR',
  he: 'שלום',
  sv: 'STAR',
  ja: 'ねこ',
  es: 'CASA',
};

type LetterFeedback = 'correct' | 'present' | 'absent';

const scoreGuess = (guess: string, target: string): LetterFeedback[] => {
  const result: LetterFeedback[] = guess.split('').map(() => 'absent' as const);
  const targetChars = target.split('');
  const used = new Set<number>();
  for (let i = 0; i < guess.length; i += 1) {
    if (guess[i] === targetChars[i]) {
      result[i] = 'correct';
      used.add(i);
    }
  }
  for (let i = 0; i < guess.length; i += 1) {
    if (result[i] === 'correct') continue;
    const idx = targetChars.findIndex((c, j) => c === guess[i] && !used.has(j));
    if (idx !== -1) {
      result[i] = 'present';
      used.add(idx);
    }
  }
  return result;
};

const FEEDBACK_BG: Record<LetterFeedback, string> = {
  correct: 'bg-neo-lime border-neo-lime text-neo-black',
  present: 'bg-neo-yellow border-neo-yellow text-neo-black',
  absent: 'bg-neo-navy-light border-neo-cream/30 text-neo-cream/60',
};

/**
 * Word-hunt practice sandbox (redesigned 2026-05-05).
 *
 * Mirrors real word-hunt: 4×4 grid drag-to-spell + target word panel above.
 * Wordle-style position feedback when guess length matches target length.
 * Real dictionary validation for any-length words (counts as "discovery").
 * Goal: spell the target word once. No submit/reset buttons. No life bar.
 */
export default function PracticeWordHuntSandbox() {
  const { language, t } = useLanguage();
  const board = BOARDS[language] ?? BOARDS.en;
  const target = TARGETS[language] ?? TARGETS.en;
  const validator = usePracticeValidator(language);
  const juice = usePracticeJuice();
  const fxRef = useRef<PracticePixiFxHandle | null>(null);
  const tutorialRef = useRef(createMicroTutorial({ mode: 'wordHunt' }));
  const [beat, setBeat] = useState<MicroTutorialBeat>(tutorialRef.current.currentBeat());
  const advanceBeat = useCallback(() => setBeat(tutorialRef.current.currentBeat()), []);

  const grid = usePracticeGridDragSelect({ rows: 4, cols: 4 });
  const [solved, setSolved] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<LetterFeedback[] | null>(null);
  const [discoveries, setDiscoveries] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'ok' | 'bad' | null>(null);

  const startedAtRef = useRef(0);
  const completedFiredRef = useRef(false);

  useEffect(() => {
    startedAtRef.current = Date.now();
    trackPracticeStarted({ mode: 'wordHunt', locale: language });
  }, [language]);

  useEffect(() => {
    if (solved && !completedFiredRef.current) {
      completedFiredRef.current = true;
      markPracticeMode('wordHunt', language);
      trackPracticeCompleted({
        mode: 'wordHunt',
        locale: language,
        wordsFound: 1,
        durationSeconds: Math.round((Date.now() - startedAtRef.current) / 1000),
        streakDay: getPracticeStreak().current,
      });
      tutorialRef.current.dispatch({ type: 'goal-reached', count: 1 });
      advanceBeat();
    }
  }, [solved, language, advanceBeat]);

  const onTilePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>, row: number, col: number) => {
      e.preventDefault();
      try { (e.target as Element).releasePointerCapture?.(e.pointerId); } catch { /* ignore */ }
      grid.clear();
      setFeedback(null);
      grid.onCellEnter(row, col, board[row][col]);
      tutorialRef.current.dispatch({ type: 'drag-started' });
      advanceBeat();
    },
    [grid, board, advanceBeat],
  );

  const onTilePointerEnter = useCallback(
    (row: number, col: number) => {
      grid.onCellEnter(row, col, board[row][col]);
    },
    [grid, board],
  );

  const onContainerPointerUp = useCallback(async () => {
    const word = grid.path.map((c) => c.letter).join('');
    if (word.length < 2) {
      grid.clear();
      return;
    }

    if (word === target) {
      setSolved(true);
      setLastFeedback(scoreGuess(word, target));
      setFeedback('ok');
      const tilePositions = grid.path.map((c) => {
        const el = document.querySelector(`[data-testid="practice-tile-${c.row}-${c.col}"]`) as Element | null;
        const rect = el?.getBoundingClientRect();
        return { x: rect?.left ?? 0, y: rect?.top ?? 0, el: el ?? document.createElement('div') };
      });
      juice.triggerWordFound(tilePositions);
      tutorialRef.current.dispatch({ type: 'word-found' });
      advanceBeat();
      grid.clear();
      return;
    }

    if (word.length === target.length) {
      setLastFeedback(scoreGuess(word, target));
    } else {
      setLastFeedback(null);
    }

    const result = await validator.check(word);
    if (result.isValid) {
      if (!discoveries.includes(word)) {
        setDiscoveries((d) => [...d, word]);
        trackPracticeWordFound({ mode: 'wordHunt', locale: language, word, wordsFound: discoveries.length + 1 });
      }
      setFeedback('ok');
      const tilePositions = grid.path.map((c) => {
        const el = document.querySelector(`[data-testid="practice-tile-${c.row}-${c.col}"]`) as Element | null;
        const rect = el?.getBoundingClientRect();
        return { x: rect?.left ?? 0, y: rect?.top ?? 0, el: el ?? document.createElement('div') };
      });
      juice.triggerWordFound(tilePositions);
    } else {
      setFeedback('bad');
      const tile = document.querySelector(`[data-testid="practice-tile-${grid.path[0].row}-${grid.path[0].col}"]`);
      if (tile) juice.triggerInvalid(tile);
    }
    grid.clear();
  }, [grid, target, validator, juice, language, discoveries, advanceBeat]);

  const currentWord = useMemo(() => grid.path.map((c) => c.letter).join(''), [grid.path]);
  const selectedKeys = useMemo(() => new Set(grid.path.map((c) => `${c.row}-${c.col}`)), [grid.path]);

  const mascotReaction: PracticeMascotMood = solved
    ? 'celebrate'
    : feedback === 'ok'
      ? 'cheer'
      : feedback === 'bad'
        ? 'wrong'
        : 'idle';

  const targetSlots = target.split('');

  return (
    <div
      className="relative flex flex-col items-center w-full max-w-md mx-auto px-4 pt-4 pb-bottom-stack gap-3"
      onPointerUp={onContainerPointerUp}
      onPointerLeave={onContainerPointerUp}
    >
      <PracticePixiFx ref={fxRef} />
      <PracticeMascotReaction mode="wordHunt" reaction={mascotReaction} />
      <PracticeModeNav current="wordHunt" />

      <div data-testid="practice-target" className="flex flex-col items-center gap-1 w-full">
        <span className="text-xs uppercase font-neo-display font-black text-neo-cream/70 tracking-wider">
          {t('practice.wordHunt.targetLabel')}
        </span>
        <div className="flex gap-1.5">
          {targetSlots.map((letter, i) => {
            const fb = lastFeedback?.[i];
            const cls = fb ? FEEDBACK_BG[fb] : 'bg-neo-cream border-neo-black text-neo-black';
            const display = solved ? letter : fb === 'correct' ? letter : '·';
            return (
              <div
                key={i}
                className={`w-9 h-9 rounded-neo border-2 flex items-center justify-center font-neo-display font-black text-lg shadow-hard-sm ${cls}`}
              >
                {display}
              </div>
            );
          })}
        </div>
      </div>

      <PracticeMicroTip
        beat={beat}
        onDismiss={() => {
          tutorialRef.current.dispatch({ type: 'beat-completed' });
          advanceBeat();
        }}
      />

      <div data-testid="practice-board" className="grid grid-cols-4 gap-2 w-full max-w-xs touch-none">
        {board.map((row, r) =>
          row.map((letter, c) => {
            const selected = selectedKeys.has(`${r}-${c}`);
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                data-testid={`practice-tile-${r}-${c}`}
                onPointerDown={(e) => onTilePointerDown(e, r, c)}
                onPointerEnter={() => onTilePointerEnter(r, c)}
                className={
                  'aspect-square rounded-neo border-2 border-neo-black font-neo-display font-black text-2xl shadow-hard-sm transition-transform ' +
                  (selected ? 'bg-neo-lime text-neo-black scale-95' : 'bg-neo-cream text-neo-black')
                }
              >
                {letter}
              </button>
            );
          }),
        )}
      </div>

      <div data-testid="practice-current-guess" className="min-h-[2rem] font-neo-display font-black text-xl text-neo-cream tracking-wider">
        {currentWord}
      </div>

      {discoveries.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 w-full">
          {discoveries.map((w) => (
            <li key={w} className="px-2 py-0.5 bg-neo-lime/20 border border-neo-lime/40 rounded text-neo-lime text-xs font-neo-display font-bold">
              {w}
            </li>
          ))}
        </ul>
      )}

      {solved && <PracticeCompleteBanner mode="wordHunt" />}
      {solved && (
        <PracticeChainCta
          currentMode="wordHunt"
          className="mt-2 inline-flex items-center justify-center w-full bg-neo-lime text-neo-black border-3 border-neo-black rounded-neo py-3 px-4 font-neo-display font-black text-base shadow-hard active:shadow-hard-pressed"
        />
      )}
    </div>
  );
}
