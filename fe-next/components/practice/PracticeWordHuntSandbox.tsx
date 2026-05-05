'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
// Reuse real-game discovered-words list so chip styling, animations, and the
// length-based color cascade (cream/cyan/pink) stay in sync with production.
import { DiscoveredWordsList } from '@/components/daily/DiscoveredWordsList';
import { usePracticeValidator } from '@/lib/practice/usePracticeValidator';
import { createMicroTutorial, type MicroTutorialBeat } from '@/lib/practice/microTutorial';
import { markPracticeMode } from '@/lib/practice/practiceProgress';
import {
  trackPracticeStarted,
  trackPracticeWordFound,
  trackPracticeCompleted,
} from '@/lib/practice/telemetry';
import { getPracticeStreak } from '@/hooks/usePracticeStreak';

// Curated practice boards — Hebrew is finals-free (matches real letter pool
// in lib/adventure/gridConstants.ts). Each board is hand-checked to ensure
// the target word can be traced via 4-or-8-neighbour adjacency.
const BOARDS: Record<string, string[][]> = {
  en: [['S', 'T', 'A', 'R'], ['E', 'O', 'N', 'I'], ['P', 'L', 'A', 'T'], ['E', 'R', 'I', 'N']],
  he: [['ש', 'ל', 'ו', 'מ'], ['ב', 'י', 'ת', 'א'], ['ה', 'נ', 'ר', 'ע'], ['ק', 'ד', 'ח', 'ג']],
  sv: [['S', 'T', 'A', 'R'], ['E', 'O', 'N', 'I'], ['P', 'L', 'A', 'T'], ['E', 'R', 'I', 'N']],
  ja: [['い', 'ぬ', 'か', 'み'], ['ね', 'こ', 'と', 'り'], ['さ', 'く', 'ら', 'ま'], ['は', 'な', 'ゆ', 'き']],
  es: [['C', 'A', 'S', 'A'], ['M', 'E', 'L', 'O'], ['T', 'I', 'A', 'R'], ['E', 'O', 'N', 'P']],
};

// Targets are short, common, and traceable on the board above. HE target
// 'בית' (house) is a 3-letter, finals-free word; path 1,0→1,1→1,2.
const TARGETS: Record<string, string> = {
  en: 'STAR',
  he: 'בית',
  sv: 'STAR',
  ja: 'ねこ',
  es: 'CASA',
};

/**
 * Word-hunt practice sandbox (rewritten 2026-05-05).
 *
 * Mirrors real word-hunt-survival WITHOUT life drain or timer:
 *   - 4×4 grid + plain target word displayed at top
 *   - drag-to-spell, drag-release auto-submits
 *   - target match → solved (mode complete)
 *   - any other valid word → bonus discovery (juice + chip)
 *
 * Wordle-style position feedback was removed 2026-05-05 — real WordHunt has
 * no per-letter hints, and the dotted "·" target panel was confusing players.
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
  // Shape matches real WordDiscovery so we can hand the list straight to
  // <DiscoveredWordsList> without an adapter.
  const [discoveries, setDiscoveries] = useState<
    Array<{ word: string; timestamp: number; lifeGained: number; tokensGained: number }>
  >([]);
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

    const result = await validator.check(word);
    if (result.isValid) {
      const already = discoveries.some((d) => d.word === word);
      if (!already) {
        setDiscoveries((d) => [
          ...d,
          { word, timestamp: Date.now(), lifeGained: 0, tokensGained: 0 },
        ]);
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

  return (
    <div
      className="relative flex flex-col items-center w-full max-w-md mx-auto px-4 pt-4 pb-bottom-stack gap-3"
      onPointerUp={onContainerPointerUp}
      onPointerLeave={onContainerPointerUp}
    >
      <PracticePixiFx ref={fxRef} />
      <PracticeMascotReaction mode="wordHunt" reaction={mascotReaction} />
      <PracticeModeNav current="wordHunt" />

      <PracticeInstructions mode="wordHunt" />

      <div data-testid="practice-target" className="flex flex-col items-center gap-1 w-full">
        <span className="text-xs uppercase font-neo-display font-black text-neo-cream/70 tracking-wider">
          {t('practice.wordHunt.targetLabel')}
        </span>
        <div
          data-testid="practice-target-word"
          className={
            'px-4 py-2 rounded-neo border-3 font-neo-display font-black text-2xl tracking-widest shadow-hard ' +
            (solved
              ? 'bg-neo-lime border-neo-black text-neo-black'
              : 'bg-neo-navy-light border-neo-lime text-neo-cream')
          }
        >
          {target}
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
        <div className="w-full" data-testid="practice-discoveries">
          <DiscoveredWordsList words={discoveries} t={t} />
        </div>
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
