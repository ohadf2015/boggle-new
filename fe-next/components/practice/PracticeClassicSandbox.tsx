'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import PracticeChainCta from './PracticeChainCta';
import PracticeCompleteBanner from './PracticeCompleteBanner';
import PracticeInstructions from './PracticeInstructions';
import PracticeMascotReaction, { type PracticeMascotMood } from './PracticeMascotReaction';
import PracticeModeNav from './PracticeModeNav';
import PracticeMicroTip from './PracticeMicroTip';
import PracticePixiFx, { type PracticePixiFxHandle } from './PracticePixiFx';
import { usePracticeGridDragSelect } from './usePracticeGridDragSelect';
import { usePracticeJuice } from './usePracticeJuice';
import { DiscoveredWordsList } from '@/components/daily/DiscoveredWordsList';
import { usePracticeValidator } from '@/lib/practice/usePracticeValidator';
import { createMicroTutorial, type MicroTutorialBeat } from '@/lib/practice/microTutorial';
import { markPracticeMode, PRACTICE_GOALS } from '@/lib/practice/practiceProgress';
import {
  trackPracticeStarted,
  trackPracticeWordFound,
  trackPracticeCompleted,
} from '@/lib/practice/telemetry';
import { getPracticeStreak } from '@/hooks/usePracticeStreak';

// Curated practice boards — guaranteed to contain ≥3 simple findable words per
// locale, intentionally finals-free for Hebrew (sofits ם ץ ך ן ף are stripped
// to mirror real game's letter pool, see lib/adventure/gridConstants.ts).
const BOARDS: Record<string, string[][]> = {
  en: [['S', 'T', 'A', 'R'], ['E', 'O', 'N', 'I'], ['P', 'L', 'A', 'T'], ['E', 'R', 'I', 'N']],
  he: [['ש', 'ל', 'ו', 'מ'], ['ב', 'י', 'ת', 'א'], ['ה', 'נ', 'ר', 'ע'], ['ק', 'ד', 'ח', 'ג']],
  sv: [['S', 'T', 'A', 'R'], ['E', 'O', 'N', 'I'], ['P', 'L', 'A', 'T'], ['E', 'R', 'I', 'N']],
  ja: [['い', 'ぬ', 'か', 'み'], ['ね', 'こ', 'と', 'り'], ['さ', 'く', 'ら', 'ま'], ['は', 'な', 'ゆ', 'き']],
  es: [['C', 'A', 'S', 'A'], ['M', 'E', 'L', 'O'], ['T', 'I', 'A', 'R'], ['E', 'O', 'N', 'P']],
};

/**
 * Classic practice sandbox (redesigned 2026-05-05).
 *
 * Mirrors the real classic engine — drag-to-spell on a 4×4 grid (diagonals
 * allowed), real dictionary validation via /api/validate-word, no submit/reset
 * buttons (drag-release auto-submits, pointer-down auto-clears). Shared infra
 * provides the Pixi+GSAP juice and the just-in-time tutorial state machine.
 */
export default function PracticeClassicSandbox() {
  const { language, t } = useLanguage();
  const board = BOARDS[language] ?? BOARDS.en;
  const validator = usePracticeValidator(language);
  const juice = usePracticeJuice();
  const fxRef = useRef<PracticePixiFxHandle | null>(null);
  const tutorialRef = useRef(createMicroTutorial({ mode: 'classic' }));
  const [beat, setBeat] = useState<MicroTutorialBeat>(tutorialRef.current.currentBeat());
  const advanceBeat = useCallback(() => setBeat(tutorialRef.current.currentBeat()), []);

  const grid = usePracticeGridDragSelect({ rows: 4, cols: 4 });
  // WordDiscovery-shaped so we can hand the list to <DiscoveredWordsList>
  // unchanged. lifeGained/tokensGained stay 0 in practice.
  const [foundWords, setFoundWords] = useState<
    Array<{ word: string; timestamp: number; lifeGained: number; tokensGained: number }>
  >([]);
  const [feedback, setFeedback] = useState<'ok' | 'bad' | 'dup' | null>(null);
  const startedAtRef = useRef(0);
  const completedFiredRef = useRef(false);
  const isComplete = foundWords.length >= PRACTICE_GOALS.classic;

  useEffect(() => {
    startedAtRef.current = Date.now();
    trackPracticeStarted({ mode: 'classic', locale: language });
  }, [language]);

  useEffect(() => {
    if (isComplete && !completedFiredRef.current) {
      completedFiredRef.current = true;
      markPracticeMode('classic', language);
      trackPracticeCompleted({
        mode: 'classic',
        locale: language,
        wordsFound: foundWords.length,
        durationSeconds: Math.round((Date.now() - startedAtRef.current) / 1000),
        streakDay: getPracticeStreak().current,
      });
      tutorialRef.current.dispatch({ type: 'goal-reached', count: foundWords.length });
      advanceBeat();
    }
  }, [isComplete, foundWords.length, language, advanceBeat]);

  const onTilePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>, row: number, col: number) => {
      e.preventDefault();
      // Release implicit pointer capture so subsequent tiles receive
      // pointerenter during touch drags. Without this, touch drags fire
      // pointerenter only on the originally-touched tile.
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
    const upper = word.toUpperCase();
    if (foundWords.some((w) => w.word === upper)) {
      setFeedback('dup');
      const tile = document.querySelector(
        `[data-testid="practice-tile-${grid.path[0].row}-${grid.path[0].col}"]`,
      );
      if (tile) juice.triggerDuplicate(tile);
      grid.clear();
      return;
    }
    const result = await validator.check(upper);
    if (result.isValid) {
      setFoundWords((prev) => {
        const next = [
          ...prev,
          { word: upper, timestamp: Date.now(), lifeGained: 0, tokensGained: 0 },
        ];
        trackPracticeWordFound({
          mode: 'classic',
          locale: language,
          word: upper,
          wordsFound: next.length,
        });
        return next;
      });
      setFeedback('ok');
      const tilePositions = grid.path.map((c) => {
        const el = document.querySelector(
          `[data-testid="practice-tile-${c.row}-${c.col}"]`,
        ) as Element | null;
        const rect = el?.getBoundingClientRect();
        return { x: rect?.left ?? 0, y: rect?.top ?? 0, el: el ?? document.createElement('div') };
      });
      juice.triggerWordFound(tilePositions);
      tutorialRef.current.dispatch({ type: 'word-found' });
      advanceBeat();
    } else {
      setFeedback('bad');
      const tile = document.querySelector(
        `[data-testid="practice-tile-${grid.path[0].row}-${grid.path[0].col}"]`,
      );
      if (tile) juice.triggerInvalid(tile);
    }
    grid.clear();
  }, [grid, foundWords, validator, juice, language, advanceBeat]);

  const currentWord = useMemo(() => grid.path.map((c) => c.letter).join(''), [grid.path]);
  const selectedKeys = useMemo(
    () => new Set(grid.path.map((c) => `${c.row}-${c.col}`)),
    [grid.path],
  );

  const mascotReaction: PracticeMascotMood = isComplete
    ? 'celebrate'
    : feedback === 'ok'
      ? 'cheer'
      : feedback === 'bad'
        ? 'wrong'
        : 'idle';

  return (
    <div
      className="relative flex flex-col items-center w-full max-w-md mx-auto px-4 pt-4 pb-bottom-stack gap-3"
      onPointerUp={onContainerPointerUp}
      onPointerLeave={onContainerPointerUp}
    >
      <PracticePixiFx ref={fxRef} />
      <PracticeMascotReaction mode="classic" reaction={mascotReaction} />
      <PracticeModeNav current="classic" />

      <div
        data-testid="practice-goal-indicator"
        className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-neo-cyan/20 border border-neo-cyan text-neo-cream text-xs font-neo-display font-black"
      >
        {foundWords.length}/{PRACTICE_GOALS.classic}
      </div>

      <PracticeInstructions mode="classic" />

      <PracticeMicroTip
        beat={beat}
        onDismiss={() => {
          tutorialRef.current.dispatch({ type: 'beat-completed' });
          advanceBeat();
        }}
      />

      <div
        data-testid="practice-board"
        className="grid grid-cols-4 gap-2 w-full max-w-xs touch-none"
      >
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
                  (selected
                    ? 'bg-neo-lime text-neo-black scale-95'
                    : 'bg-neo-cream text-neo-black')
                }
              >
                {letter}
              </button>
            );
          }),
        )}
      </div>

      <div
        data-testid="practice-current-word"
        className="min-h-[2rem] font-neo-display font-black text-xl text-neo-cream tracking-wider"
      >
        {currentWord}
      </div>

      <div className="w-full" data-testid="practice-discoveries">
        <DiscoveredWordsList words={foundWords} t={t} />
      </div>

      {isComplete && <PracticeCompleteBanner mode="classic" />}
      {isComplete && (
        <PracticeChainCta
          currentMode="classic"
          className="mt-2 inline-flex items-center justify-center w-full bg-neo-lime text-neo-black border-3 border-neo-black rounded-neo py-3 px-4 font-neo-display font-black text-base shadow-hard active:shadow-hard-pressed"
        />
      )}
    </div>
  );
}
