'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCheck, Eye, List, RotateCcw, Lightbulb } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useCrosswordGame } from '@/hooks/useCrosswordGame';
import { crosswordStats, solvedSlotIds } from '@/lib/crossword/stats';
import { isNewspaperScale, type CrosswordFormat } from '@/lib/crossword/format';
import type { CrosswordPuzzle, Difficulty, Slot } from '@/lib/crossword/types';
import { ClueScramble } from './ClueScramble';
import { CrosswordGrid } from './CrosswordGrid';
import { CrosswordInputDock } from './CrosswordInputDock';
import { CrosswordMasthead } from './CrosswordMasthead';
import { CrosswordProgressRow } from './CrosswordProgressRow';
import { CrosswordToolbar } from './CrosswordToolbar';
import { CrosswordSolvedCard } from './CrosswordSolvedCard';
import { ClueBar } from './ClueBar';
import { CrosswordClueList } from './CrosswordClueList';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CrosswordFx } from './CrosswordFx';
import { CrosswordComboChip } from './CrosswordComboChip';
import { GameMascotReactions } from '@/components/mascot/GameMascotReactions';
import { ScreenFlashOverlay } from '@/components/game/ScreenFlashOverlay';
import {
  awardSoloDaily,
  getSoloDateISO,
  isSoloDailyClaimed,
  pickDailyModifier,
} from '@/lib/solo/soloDaily';
import { crosswordScore } from '@/lib/solo/soloReward';
import { useCrosswordHardwareKeys } from '@/hooks/useCrosswordHardwareKeys';

export interface CrosswordViewProps {
  puzzle: CrosswordPuzzle;
  /** Masthead edition line — a formatted date for the daily, "Freeplay #N" otherwise. */
  edition?: string;
  /** Current daily streak (shown in the masthead + bumped on a daily solve). */
  streak?: number;
  /** True when this puzzle is today's daily — only daily solves advance the streak. */
  isDaily?: boolean;
  /** Start a fresh generated puzzle (endless). Optional difficulty target. */
  onNewPuzzle?: (difficulty?: Difficulty) => void;
  /** Fired once when the daily is solved, so the host can persist the streak. */
  onDailySolved?: () => void;
  /** Which board size is being solved. */
  format?: CrosswordFormat;
  /** Omitted where the locale's clue bank can't fill a full-size grid — then no toggle renders. */
  onFormatChange?: (format: CrosswordFormat) => void;
}

// Phones: over the masthead's difficulty label, clear of the size toggle and the streak badge; desktop: the free gutter beside the clue rail.
// Phones: in the header's free corner between the title and the sound button, clear of the difficulty badge.
const CROSSWORD_MASCOT_SLOT =
  'top-[max(0.625rem,env(safe-area-inset-top))] end-[3.25rem] scale-75 ltr:origin-top-right rtl:origin-top-left lg:top-40 lg:end-3 lg:scale-100';

export function CrosswordView({
  puzzle,
  edition,
  streak = 0,
  isDaily = false,
  onNewPuzzle,
  onDailySolved,
  format = 'mini',
  onFormatChange,
}: CrosswordViewProps) {
  const { t, language, dir } = useLanguage();
  const { playSound } = useSoundEffects();
  const [burst, setBurst] = useState(0);
  const [winFlash, setWinFlash] = useState(0);
  const [comboLevel, setComboLevel] = useState(0);
  const game = useCrosswordGame(puzzle, {
    onSolved: () => {
      setBurst((n) => n + 1);
      setWinFlash((n) => n + 1);
      playSound('victoryFanfare');
      if (isDaily) onDailySolved?.();
    },
  });

  // Full-screen game: hide global header / bottom-nav / footer so the board
  // owns the viewport (and surfaces the in-game mute FAB).
  const setIsInGame = useHideNavigation();
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);
  const {
    state,
    activeSlot,
    elapsedMs,
    focusCell,
    toggleDir,
    inputLetter,
    backspace,
    moveInSlot,
    moveVertical,
    revealCell,
    revealWord,
    checkAll,
    nextSlot,
    focusSlot,
    reset,
  } = game;

  const solved = state.status === 'solved';
  const stats = useMemo(() => crosswordStats(state), [state]);
  const solvedIds = useMemo(() => solvedSlotIds(state), [state]);
  const hintsUsed = state.revealed.length;

  // Clue Scramble: show a 10s mini-overlay on first clue selection per slot.
  const [pendingSlot, setPendingSlot] = useState<Slot | null>(null);
  const [clueStreak, setClueStreak] = useState(0);
  const [cluesOpen, setCluesOpen] = useState(false);
  // A mini's clues are all reachable from the clue bar's prev/next and swipe. A newspaper grid
  // has 40+, where stepping one at a time is not navigation — those need a jumpable list.
  const manyClues = isNewspaperScale(puzzle.slots.length);
  const scrambleAttempted = useRef(new Set<string>());

  const handleClueSelect = useCallback(
    (slot: Slot) => {
      // The Scramble is a once-per-slot flourish that reads well across a mini's ten clues. On a
      // newspaper grid it would fire 40+ times — minutes of forced mini-games standing between the
      // player and the puzzle they opened — so a full-size board skips straight to the slot.
      if (solved || manyClues || scrambleAttempted.current.has(slot.id)) {
        focusSlot(slot.id);
      } else {
        scrambleAttempted.current.add(slot.id);
        setPendingSlot(slot);
      }
    },
    [solved, manyClues, focusSlot],
  );

  const handleScrambleResult = useCallback(
    (didSolve: boolean) => {
      if (didSolve) setClueStreak((n) => n + 1);
      if (pendingSlot) focusSlot(pendingSlot.id);
      setPendingSlot(null);
    },
    [pendingSlot, focusSlot],
  );

  // Solo Daily layer: shared per-day modifier + once-per-day coin award on solve.
  const today = useMemo(() => getSoloDateISO(), []);
  const dailyModifier = useMemo(() => pickDailyModifier('crossword', today), [today]);
  const [soloAward, setSoloAward] = useState<{ awarded: number; bonus: number; claimed: boolean } | null>(null);
  const soloAwardedRef = useRef(false);
  useEffect(() => {
    if (!solved) { soloAwardedRef.current = false; return; }
    if (soloAwardedRef.current) return;
    soloAwardedRef.current = true;
    const score = crosswordScore(elapsedMs, hintsUsed, stats.wordsTotal);
    const claimedBefore = isSoloDailyClaimed('crossword', today, puzzle.locale);
    const res = awardSoloDaily('crossword', today, puzzle.locale, score, true);
    setSoloAward(
      res
        ? { awarded: res.awarded, bonus: res.bonus, claimed: false }
        : { awarded: 0, bonus: 0, claimed: claimedBefore },
    );
  }, [solved, elapsedMs, hintsUsed, stats.wordsTotal, today, puzzle.locale]);

  useCrosswordHardwareKeys({ backspace, moveInSlot, moveVertical, inputLetter, toggleDir, nextSlot }, puzzle.rtl);

  const handleReveal = useCallback(() => revealCell(), [revealCell]);

  // "Next" on the solve card: start a fresh generated puzzle if the host wired endless mode,
  // otherwise replay the same grid.
  const handleNext = useCallback(() => {
    if (onNewPuzzle) onNewPuzzle();
    else {
      setSoloAward(null);
      reset();
    }
  }, [onNewPuzzle, reset]);

  const toolActions = [
    { key: 'check', label: t('crossword.check'), icon: <CheckCheck size={18} />, onClick: checkAll },
    { key: 'letter', label: t('crossword.revealLetter'), icon: <Lightbulb size={18} />, onClick: handleReveal },
    { key: 'word', label: t('crossword.revealWord'), icon: <Eye size={18} />, onClick: revealWord },
    ...(manyClues
      ? [{ key: 'clues', label: t('crossword.allClues'), icon: <List size={18} />, onClick: () => setCluesOpen(true) }]
      : []),
    { key: 'restart', label: t('crossword.restart'), confirmLabel: t('crossword.restartConfirm'), icon: <RotateCcw size={18} />, onClick: reset },
  ];

  return (
    <div
      className="fixed inset-x-0 top-0 z-20 flex h-[100dvh] w-full flex-col gap-2 overflow-hidden bg-neo-navy texture-halftone px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:relative lg:z-auto lg:mx-auto lg:flex lg:h-auto lg:max-w-6xl lg:gap-3 lg:overflow-visible lg:bg-transparent lg:pt-8 lg:pb-10"
      translate="no"
      dir={dir}
    >
      <ScreenFlashOverlay trigger={winFlash} colorClass="bg-neo-cyan/40" />

      {/* Newspaper masthead — the identity ("real crossword") signal. */}
      <CrosswordMasthead
        title={t('crossword.mastheadTitle')}
        edition={edition ?? t('crossword.title')}
        difficulty={puzzle.difficulty}
        difficultyLabel={t(`crossword.difficulty.${puzzle.difficulty}`)}
        streak={streak}
        streakLabel={t('crossword.streakLabel', { count: streak })}
      />

      {/* Mini ↔ Full, live fill bar (fills with CORRECT letters, so it only completes at a true
          solve), words and timer — one slim row. Each size keeps its own daily and saved progress. */}
      <CrosswordProgressRow
        wordsSolved={stats.wordsSolved}
        wordsTotal={stats.wordsTotal}
        percent={stats.percent}
        elapsedMs={elapsedMs}
        format={format}
        onFormatChange={onFormatChange}
        t={t}
      />

      {/* Board + clues. On phones a single fit-to-viewport column (clue, board, tools, keyboard
          pinned); board + clue rail side by side on desktop. */}
      <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-8 rtl:lg:grid-cols-[24rem_minmax(0,1fr)]">
        {/* Desktop column width = the board's width, so clue bar, board and toolbar share one edge:
            as tall as the viewport allows (header + clue bar + toolbar reserved), capped so a 5x5
            doesn't balloon. Literal class strings so Tailwind can see them. */}
        <div
          className={`flex min-h-0 flex-1 flex-col gap-2 lg:mx-auto lg:w-full lg:gap-3 ${
            puzzle.size <= 7
              ? 'lg:max-w-[min(32rem,calc(100dvh-21rem))]'
              : 'lg:max-w-[min(46rem,calc(100dvh-21rem))]'
          }`}
        >
          {/* Clue + board + tools as ONE group, centered in whatever height the pinned keyboard
              leaves, so a square board on a tall phone doesn't strand empty bands between them. */}
          <div className="flex min-h-0 flex-1 flex-col justify-center gap-2 lg:flex-none lg:justify-start lg:gap-3">
            {/* The active clue sits ABOVE the board (the NYT/Guardian convention): your eyes stay on
                one column — read the clue, look down at the squares, type. */}
            <div className="mx-auto w-full max-w-[28rem] shrink-0 lg:max-w-none">
              <ClueBar
                slot={activeSlot}
                rtl={puzzle.rtl}
                onPrev={() => nextSlot(-1)}
                onNext={() => nextSlot(1)}
                onToggleDir={toggleDir}
                t={t}
              />
            </div>

            {/* Board. On mobile this box owns whatever height is left after the pinned chrome and
                declares itself a size-query container, so the grid's `100cqmin` resolves to the
                real free space and can never clip. Nothing here scrolls. */}
            <div className="flex min-h-0 flex-1 max-h-[min(calc(100vw-1.5rem),28rem)] [container-type:size] lg:block lg:max-h-none lg:flex-none lg:[container-type:normal]">
              <CrosswordGrid
                state={state}
                onSelect={focusCell}
                t={t}
                solved={solved}
                juice="full"
                onComboChange={setComboLevel}
              />
            </div>

            <div className="mx-auto w-full max-w-[28rem] shrink-0 lg:max-w-none">
              <CrosswordToolbar actions={toolActions} />
            </div>
          </div>

          {/* Pinned to the bottom on mobile so the page never scrolls. */}
          <CrosswordInputDock
            className="shrink-0 pt-0.5"
            locale={puzzle.locale}
            onLetter={inputLetter}
            onBackspace={backspace}
            disabled={solved}
            activeKey={`${state.active.row},${state.active.col},${state.dir}`}
            t={t}
          />
        </div>

        {/* Desktop: the Across/Down clue rail, the strongest "this is a real crossword" signal. */}
        <aside className="hidden lg:block lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto pe-0.5">
          <CrosswordClueList
            slots={puzzle.slots}
            activeSlotId={activeSlot?.id ?? null}
            onSelect={handleClueSelect}
            t={t}
            columns="stacked"
            capturedSlotIds={solvedIds}
          />
        </aside>
      </div>

      {/* Mobile "All clues" sheet. The desktop rail already does this job, so this exists only
          for phones — where a 40-clue grid is otherwise navigable one step at a time.
          bg-neo-navy is hardcoded rather than the cream/navy pair: this is a dark-only game
          surface, and the pair flashes cream before the dark class resolves on a lazy mount. */}
      <Dialog open={cluesOpen} onOpenChange={setCluesOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto bg-neo-navy text-neo-white">
          <DialogHeader>
            <DialogTitle>{t('crossword.allClues')}</DialogTitle>
          </DialogHeader>
          <CrosswordClueList
            slots={puzzle.slots}
            activeSlotId={activeSlot?.id ?? null}
            onSelect={(slot) => {
              setCluesOpen(false);
              handleClueSelect(slot);
            }}
            t={t}
            capturedSlotIds={solvedIds}
          />
        </DialogContent>
      </Dialog>

      {/* Clue Scramble overlay — shown once per slot, before focusing it */}
      {pendingSlot && (
        <ClueScramble answer={pendingSlot.answer} onResult={handleScrambleResult} />
      )}

      {/* Streak badge — fades in after first scramble solve */}
      {clueStreak > 0 && (
        <div
          aria-label={t('crossword.scramble.streakAria', { count: clueStreak })}
          className="fixed top-4 end-4 z-[60] flex items-center gap-1 bg-neo-navy border-neo border-black rounded-neo shadow-hard px-2.5 py-1 font-neo-display font-bold text-neo-lime text-sm pointer-events-none"
        >
          🔥 {clueStreak}
        </div>
      )}

      {solved && (
        <CrosswordSolvedCard
          t={t}
          language={language}
          elapsedMs={elapsedMs}
          wordsTotal={stats.wordsTotal}
          hintsUsed={hintsUsed}
          soloAward={soloAward}
          dailyModifier={dailyModifier}
          onNewPuzzle={onNewPuzzle}
          onReset={reset}
          onNext={handleNext}
        />
      )}

      <CrosswordComboChip level={comboLevel} t={t} />
      <GameMascotReactions mode="crossword" comboLevel={comboLevel} slotClassName={CROSSWORD_MASCOT_SLOT} />

      <CrosswordFx burstKey={burst} />
    </div>
  );
}
