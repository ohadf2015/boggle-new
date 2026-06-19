'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCheck, Eye, RotateCcw, Lightbulb, Timer, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useCrosswordGame } from '@/hooks/useCrosswordGame';
import { crosswordStats } from '@/lib/crossword/stats';
import type { CrosswordPuzzle, Difficulty } from '@/lib/crossword/types';
import { CrosswordGrid } from './CrosswordGrid';
import { CrosswordKeyboard } from './CrosswordKeyboard';
import { CrosswordMasthead } from './CrosswordMasthead';
import { ClueBar } from './ClueBar';
import { CrosswordClueList } from './CrosswordClueList';
import { CrosswordFx } from './CrosswordFx';
import { ScreenFlashOverlay } from '@/components/game/ScreenFlashOverlay';
import { SoloRewardCard } from '@/components/solo/SoloRewardCard';
import {
  awardSoloDaily,
  getSoloDateISO,
  isSoloDailyClaimed,
  pickDailyModifier,
} from '@/lib/solo/soloDaily';
import { crosswordScore } from '@/lib/solo/soloReward';

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

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
}

export function CrosswordView({
  puzzle,
  edition,
  streak = 0,
  isDaily = false,
  onNewPuzzle,
  onDailySolved,
}: CrosswordViewProps) {
  const { t } = useLanguage();
  const reduced = useReducedMotion();
  const { playSound } = useSoundEffects();
  const [burst, setBurst] = useState(0);
  const [winFlash, setWinFlash] = useState(0);
  const game = useCrosswordGame(puzzle, {
    onSolved: () => {
      setBurst((n) => n + 1);
      setWinFlash((n) => n + 1);
      playSound('victoryFanfare');
      if (isDaily) onDailySolved?.();
    },
    // A light confirmation each time a word is filled in correctly — the
    // newspaper-solve "tick" of progress before the final fanfare.
    onWordSolved: () => playSound('wordAccepted'),
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
    revealCell,
    revealWord,
    checkAll,
    nextSlot,
    focusSlot,
    reset,
  } = game;

  const solved = state.status === 'solved';
  const overlayRef = useRef<HTMLDivElement>(null);
  const stats = useMemo(() => crosswordStats(state), [state]);
  const hintsUsed = state.revealed.length;

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

  // Hardware keyboard support.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key;
      if (key === 'Backspace') {
        e.preventDefault();
        backspace();
      } else if (key === 'ArrowRight') {
        moveInSlot(puzzle.rtl ? -1 : 1);
      } else if (key === 'ArrowLeft') {
        moveInSlot(puzzle.rtl ? 1 : -1);
      } else if (key === 'ArrowDown' || key === 'ArrowUp') {
        // vertical nav toggles to down if needed, then moves
        if (state.dir !== 'down') toggleDir();
        else moveInSlot(key === 'ArrowDown' ? 1 : -1);
      } else if (key === ' ' || key === 'Tab') {
        e.preventDefault();
        if (key === 'Tab') nextSlot(e.shiftKey ? -1 : 1);
        else toggleDir();
      } else if (key.length === 1 && /\p{L}/u.test(key)) {
        inputLetter(key);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [backspace, moveInSlot, inputLetter, toggleDir, nextSlot, state.dir, puzzle.rtl]);

  // GSAP entrance for the solved card.
  useEffect(() => {
    if (!solved || reduced || !overlayRef.current) return;
    let ctx: { revert: () => void } | null = null;
    (async () => {
      const gsap = (await import('gsap')).default;
      if (!overlayRef.current) return;
      ctx = gsap.context(() => {
        gsap.fromTo(
          overlayRef.current,
          { scale: 0.8, opacity: 0, y: 24 },
          { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' },
        );
      });
    })();
    return () => ctx?.revert();
  }, [solved, reduced]);

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

  return (
    <div
      className="fixed inset-x-0 top-0 z-20 flex h-[100dvh] w-full flex-col overflow-hidden bg-neo-navy texture-halftone px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:static lg:z-auto lg:mx-auto lg:block lg:h-auto lg:max-w-5xl lg:overflow-visible lg:bg-transparent lg:pt-9 lg:pb-10"
      translate="no"
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

      {/* Slim stat bar: words solved + timer + the live fill bar (fills with CORRECT letters,
          so it only completes at a true solve). */}
      <div className="shrink-0 mt-2 flex items-center gap-3 bg-neo-navy-light border-neo border-black rounded-neo shadow-hard px-3 py-1.5">
        <span
          className="font-neo-display font-bold text-sm text-neo-cyan tabular-nums shrink-0"
          aria-label={t('crossword.wordsLabel')}
        >
          {stats.wordsSolved}
          <span className="text-neo-white/55">/{stats.wordsTotal}</span>
        </span>
        <div
          className="flex-1 h-2 bg-neo-navy border-neo border-black rounded-full overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={stats.percent}
          aria-label={t('crossword.progressLabel')}
        >
          <div
            className="h-full bg-neo-cyan transition-[width] duration-500 ease-out"
            style={{ width: `${stats.percent}%` }}
          />
        </div>
        <div
          className="flex items-center gap-1.5 font-neo-display font-bold text-sm text-neo-white tabular-nums shrink-0"
          aria-label={t('crossword.timer')}
        >
          <Timer size={15} className="text-neo-cyan" />
          {formatTime(elapsedMs)}
        </div>
      </div>

      {/* Board + clues. On phones a single fit-to-viewport column (grid+clues
          scroll in the middle, keyboard pinned); grid left / clue rail right on
          desktop. */}
      <div className="mt-3 flex min-h-0 flex-1 flex-col lg:mt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-6 lg:items-start">
        <div className="flex min-h-0 flex-1 flex-col gap-2 lg:block lg:gap-3">
          {/* Scrollable middle on mobile so the keyboard can stay pinned. */}
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain lg:flex-none lg:gap-3 lg:overflow-visible">
            <CrosswordGrid state={state} onSelect={focusCell} t={t} solved={solved} />

            {/* Desktop keeps the clue under the grid. On mobile it's pinned just
                above the keyboard instead (below), so it never scrolls out of
                view while you're filling letters. */}
            <div className="hidden lg:block">
              <ClueBar
                slot={activeSlot}
                rtl={puzzle.rtl}
                onPrev={() => nextSlot(-1)}
                onNext={() => nextSlot(1)}
                onToggleDir={toggleDir}
                t={t}
              />
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <ToolButton onClick={checkAll} icon={<CheckCheck size={16} />} label={t('crossword.check')} />
              <ToolButton onClick={handleReveal} icon={<Lightbulb size={16} />} label={t('crossword.revealLetter')} />
              <ToolButton onClick={revealWord} icon={<Eye size={16} />} label={t('crossword.revealWord')} />
              <ToolButton onClick={reset} icon={<RotateCcw size={16} />} label={t('crossword.restart')} />
            </div>

            {/* Mobile: full clue list tucked into a disclosure so it doesn't crowd the board. */}
            <details className="lg:hidden group bg-neo-navy-light border-neo border-black rounded-neo shadow-hard">
              <summary className="flex items-center justify-between gap-2 cursor-pointer list-none px-3 py-2.5 font-neo-display font-bold text-sm text-neo-white">
                {t('crossword.allClues')}
                <ChevronDown size={18} className="transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-2.5 pb-2.5">
                <CrosswordClueList
                  slots={puzzle.slots}
                  activeSlotId={activeSlot?.id ?? null}
                  onSelect={(slot) => focusSlot(slot.id)}
                  t={t}
                />
              </div>
            </details>
          </div>

          {/* Mobile: the active clue pinned directly above the keyboard, so it
              stays in view the whole time you're typing (newspaper habit). */}
          <div className="shrink-0 lg:hidden">
            <ClueBar
              slot={activeSlot}
              rtl={puzzle.rtl}
              onPrev={() => nextSlot(-1)}
              onNext={() => nextSlot(1)}
              onToggleDir={toggleDir}
              t={t}
            />
          </div>

          {/* On-screen keyboard — touch only; pinned to the bottom on mobile so
              the page never scrolls. Desktop uses the physical keyboard. */}
          <div className="shrink-0 pt-1 lg:hidden">
            <CrosswordKeyboard
              locale={puzzle.locale}
              onLetter={inputLetter}
              onBackspace={backspace}
              disabled={solved}
              backspaceLabel={t('crossword.backspace')}
            />
          </div>
        </div>

        {/* Desktop: the Across/Down clue rail, the strongest "this is a real crossword" signal. */}
        <aside className="hidden lg:block lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto pe-0.5">
          <CrosswordClueList
            slots={puzzle.slots}
            activeSlotId={activeSlot?.id ?? null}
            onSelect={(slot) => focusSlot(slot.id)}
            t={t}
            columns="stacked"
          />
        </aside>
      </div>

      {solved && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neo-navy/75 p-6">
          <div
            ref={overlayRef}
            className="bg-neo-cyan text-neo-navy border-neo-thick border-black rounded-neo shadow-hard-lg px-8 py-7 text-center max-w-sm w-full"
          >
            <div className="text-5xl mb-1" aria-hidden>
              🎉
            </div>
            <h2 className="font-neo-display font-extrabold text-2xl mb-3">
              {t('crossword.solvedTitle')}
            </h2>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <SolvedStat value={formatTime(elapsedMs)} label={t('crossword.timer')} />
              <SolvedStat value={`${stats.wordsTotal}`} label={t('crossword.wordsLabel')} />
              <SolvedStat value={`${hintsUsed}`} label={t('crossword.hintsLabel')} />
            </div>
            {soloAward && (
              <SoloRewardCard
                t={t}
                awarded={soloAward.awarded}
                bonus={soloAward.bonus}
                modifier={dailyModifier}
                claimed={soloAward.claimed}
                onPlayAgain={handleNext}
              />
            )}
            {onNewPuzzle ? (
              // Endless: pick the next puzzle by difficulty (or replay the same grid).
              <div className={soloAward ? 'mt-3' : ''}>
                <p className="font-neo-body font-semibold text-[0.65rem] uppercase tracking-[0.12em] text-neo-navy/70 mb-2">
                  {t('crossword.nextPuzzlePrompt')}
                </p>
                <div className="flex items-center justify-center gap-2">
                  {(['easy', 'medium', 'hard'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => onNewPuzzle(d)}
                      className={`font-neo-display font-bold text-sm border-neo border-black rounded-neo shadow-hard px-4 py-2 active:translate-y-[1px] active:shadow-hard-pressed ${
                        d === 'easy'
                          ? 'bg-neo-lime text-neo-navy'
                          : d === 'hard'
                            ? 'bg-neo-pink text-neo-white'
                            : 'bg-neo-navy text-neo-white'
                      }`}
                    >
                      {t(`crossword.difficulty.${d}`)}
                    </button>
                  ))}
                </div>
                {!soloAward && (
                  <button
                    type="button"
                    onClick={reset}
                    className="mt-3 font-neo-body font-semibold text-xs text-neo-navy/70 underline underline-offset-2"
                  >
                    {t('crossword.playAgain')}
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={reset}
                className="font-neo-display font-bold bg-neo-navy text-neo-white border-neo border-black rounded-neo shadow-hard px-6 py-2.5 active:translate-y-[1px] active:shadow-hard-pressed"
              >
                {t('crossword.playAgain')}
              </button>
            )}
          </div>
        </div>
      )}

      <CrosswordFx burstKey={burst} />
    </div>
  );
}

function SolvedStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-neo-navy text-neo-cream border-neo border-black rounded-neo px-1 py-2">
      <div className="font-neo-display font-extrabold text-xl tabular-nums leading-none">{value}</div>
      <div className="font-neo-body font-semibold text-[0.6rem] uppercase tracking-wide mt-1 opacity-75">
        {label}
      </div>
    </div>
  );
}

function ToolButton({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 font-neo-body font-semibold text-sm bg-neo-navy-light text-neo-white border-neo border-black rounded-neo shadow-hard px-3 py-2 active:translate-y-[1px] active:shadow-hard-pressed"
    >
      {icon}
      {label}
    </button>
  );
}
