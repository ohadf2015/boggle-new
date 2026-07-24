'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Settings, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useCrosswordGame } from '@/hooks/useCrosswordGame';
import { crosswordStats, solvedSlotIds } from '@/lib/crossword/stats';
import { checkAll as checkAllFn } from '@/lib/crossword/gameState';
import type { CrosswordPuzzle, Difficulty, Slot } from '@/lib/crossword/types';
import { ClueScramble } from './ClueScramble';
import { CrosswordGrid } from './CrosswordGrid';
import { CrosswordKeyboard } from './CrosswordKeyboard';
import { CrosswordMasthead } from './CrosswordMasthead';
import { ClueBar } from './ClueBar';
import { CrosswordClueList } from './CrosswordClueList';
import { CrosswordFx } from './CrosswordFx';
import { CrosswordToolbar } from './CrosswordToolbar';
import { CrosswordSolvedCard } from './CrosswordSolvedCard';
import { ScreenFlashOverlay } from '@/components/game/ScreenFlashOverlay';
import {
  awardSoloDaily,
  getSoloDateISO,
  isSoloDailyClaimed,
  pickDailyModifier,
} from '@/lib/solo/soloDaily';
import { crosswordScore } from '@/lib/solo/soloReward';
import { computeKeyboardState } from '@/lib/crossword/keyboardState';

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export interface CrosswordViewProps {
  puzzle: CrosswordPuzzle;
  edition?: string;
  streak?: number;
  isDaily?: boolean;
  onNewPuzzle?: (difficulty?: Difficulty) => void;
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
  const { t, language, dir } = useLanguage();
  const reduced = useReducedMotion();
  const { playSound } = useSoundEffects();
  const [burst, setBurst] = useState(0);
  const [winFlash, setWinFlash] = useState(0);
  const [wordSolvedSlots, setWordSolvedSlots] = useState<string[]>([]);
  const game = useCrosswordGame(puzzle, {
    onSolved: () => {
      setBurst((n) => n + 1);
      setWinFlash((n) => n + 1);
      playSound('victoryFanfare');
      if (isDaily) onDailySolved?.();
    },
    onWordSolved: (slotId: string) => {
      playSound('wordAccepted');
      setWordSolvedSlots((prev) => [...prev, slotId]);
      setTimeout(() => setWordSolvedSlots((prev) => prev.filter((id) => id !== slotId)), 1500);
    },
  });

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
    justSolvedSlot,
  } = game;

  const solved = state.status === 'solved';
  const overlayRef = useRef<HTMLDivElement>(null);
  const stats = useMemo(() => crosswordStats(state), [state]);
  const hintsUsed = state.revealed.length;

  // Timer visibility toggle (stored in localStorage)
  const [showTimer, setShowTimer] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('cw:showTimer') !== 'false';
  });
  const toggleTimer = useCallback(() => {
    setShowTimer((v) => {
      const nv = !v;
      localStorage.setItem('cw:showTimer', String(nv));
      return nv;
    });
  }, []);

  // Auto-check mode (stored in localStorage)
  const [autoCheck, setAutoCheck] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('cw:autoCheck') === 'true';
  });

  const toggleAutoCheck = useCallback(() => {
    setAutoCheck((v) => {
      const nv = !v;
      localStorage.setItem('cw:autoCheck', String(nv));
      return nv;
    });
  }, []);

  // Auto-check after each input that fills the last blank
  const handleInput = useCallback((letter: string) => {
    inputLetter(letter);
    // Will check in effect after state updates
  }, [inputLetter]);

  // Auto-check: when a slot becomes fully filled, run checkAll
  useEffect(() => {
    if (!autoCheck || solved) return;
    const solvedIds = solvedSlotIds(game.state);
    // Check if any slot just became fully filled (has all entries but isn't solved)
    for (const slot of game.state.puzzle.slots) {
      const filled = slot.cells.every((c) => game.state.entries[`${c.row},${c.col}`]);
      if (filled && !solvedIds.includes(slot.id)) {
        checkAll();
        break;
      }
    }
  }, [game.state.entries, autoCheck, solved, checkAll, game.state.puzzle.slots, game.state]);

  // Clue Scramble
  const [pendingSlot, setPendingSlot] = useState<Slot | null>(null);
  const [clueStreak, setClueStreak] = useState(0);
  const scrambleAttempted = useRef(new Set<string>());

  const handleClueSelect = useCallback(
    (slot: Slot) => {
      if (solved || scrambleAttempted.current.has(slot.id)) {
        focusSlot(slot.id);
      } else {
        scrambleAttempted.current.add(slot.id);
        setPendingSlot(slot);
      }
    },
    [solved, focusSlot],
  );

  const handleScrambleResult = useCallback(
    (didSolve: boolean) => {
      if (didSolve) setClueStreak((n) => n + 1);
      if (pendingSlot) focusSlot(pendingSlot.id);
      setPendingSlot(null);
    },
    [pendingSlot, focusSlot],
  );

  // Solo Daily
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

  // Hardware keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) return;
      const key = e.key;
      if (key === 'Backspace') { e.preventDefault(); backspace(); }
      else if (key === 'ArrowRight') { e.preventDefault(); moveInSlot(puzzle.rtl ? -1 : 1); }
      else if (key === 'ArrowLeft') { e.preventDefault(); moveInSlot(puzzle.rtl ? 1 : -1); }
      else if (key === 'ArrowDown' || key === 'ArrowUp') {
        e.preventDefault();
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

  // Solved card entrance
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

  const handleNext = useCallback(() => {
    if (onNewPuzzle) onNewPuzzle();
    else { setSoloAward(null); reset(); }
  }, [onNewPuzzle, reset]);

  // Share handler
  const handleShare = useCallback(() => {
    const gridLines = puzzle.cells.filter((c) => !c.block).reduce((acc, c) => {
      const key = `${c.row},${c.col}`;
      return acc + (state.entries[key] === c.solution ? '◇' : '▹');
    }, '');
    const text = `${t('crossword.mastheadTitle')} — ${edition ?? t('crossword.title')}\n${formatTime(elapsedMs)} | ${stats.wordsSolved}/${stats.wordsTotal} ${t('crossword.wordsLabel')}\n${gridLines}`;
    navigator.clipboard?.writeText(text).catch(() => {});
    // Also try Web Share API
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    }
  }, [puzzle, state.entries, edition, t, elapsedMs, stats.wordsSolved, stats.wordsTotal]);

  // Compute keyboard state from game state
  const { usedLetters, correctLetters, wrongLetters } = useMemo(() => {
    const kbs = computeKeyboardState(state);
    return {
      usedLetters: kbs.used,
      correctLetters: kbs.correct,
      wrongLetters: kbs.wrong,
    };
  }, [state]);

  // Mobile clue list state
  const [showAllClues, setShowAllClues] = useState(false);

  // Mini clue list: show active slot + next across + next down + just solved
  const miniClues = useMemo(() => {
    const result: Slot[] = [];
    if (activeSlot && !result.find((s) => s.id === activeSlot.id)) result.push(activeSlot);
    // Find next across and down clues
    for (const slot of puzzle.slots) {
      if (result.length >= 3) break;
      if (slot.id === activeSlot?.id) continue;
      result.push(slot);
    }
    return result;
  }, [activeSlot, puzzle.slots]);

  return (
    <div
      className="fixed inset-x-0 top-0 z-20 flex h-[100dvh] w-full flex-col overflow-hidden bg-neo-navy texture-halftone px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:static lg:z-auto lg:mx-auto lg:block lg:h-auto lg:max-w-5xl lg:overflow-visible lg:bg-transparent lg:pt-9 lg:pb-10"
      translate="no"
      dir={dir}
    >
      <ScreenFlashOverlay trigger={winFlash} colorClass="bg-neo-cyan/40" />

      <CrosswordMasthead
        title={t('crossword.mastheadTitle')}
        edition={edition ?? t('crossword.title')}
        difficulty={puzzle.difficulty}
        difficultyLabel={t(`crossword.difficulty.${puzzle.difficulty}`)}
        streak={streak}
        streakLabel={t('crossword.streakLabel', { count: streak })}
      />

      {/* Stat bar: progress + timer + settings */}
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
        {showTimer && (
          <div
            className="flex items-center gap-1.5 font-neo-display font-bold text-sm text-neo-white tabular-nums shrink-0"
            aria-label={t('crossword.timer')}
          >
            <span className="text-neo-cyan text-[10px]">◈</span>
            {formatTime(elapsedMs)}
          </div>
        )}
        <button
          type="button"
          onClick={toggleTimer}
          className="shrink-0 text-neo-white/50 hover:text-neo-white transition-colors"
          aria-label={t('crossword.timerToggle')}
        >
          <Settings size={15} />
        </button>
      </div>

      {/* Board + clues */}
      <div className="mt-3 flex min-h-0 flex-1 flex-col lg:mt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-6 lg:items-start rtl:lg:grid-cols-[21rem_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-1 flex-col gap-2 lg:block lg:gap-3">
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain lg:flex-none lg:gap-3 lg:overflow-visible">
            <CrosswordGrid state={state} onSelect={focusCell} t={t} solved={solved} wordSolvedSlots={wordSolvedSlots} />

            {/* Desktop clue bar */}
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

            {/* Toolbar with hierarchy */}
            <CrosswordToolbar
              onCheck={checkAll}
              onRevealLetter={handleReveal}
              onRevealWord={revealWord}
              onReset={reset}
              autoCheck={autoCheck}
              onToggleAutoCheck={toggleAutoCheck}
              t={t}
            />

            {/* Mobile: mini clue list + show all */}
            <div className="lg:hidden">
              {!showAllClues ? (
                <div className="bg-neo-navy-light border-neo border-black rounded-neo shadow-hard">
                  <div className="flex flex-col">
                    {miniClues.slice(0, 3).map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => focusSlot(slot.id)}
                        className={`flex items-center gap-2 px-3 py-2 text-start border-b border-black/10 last:border-b-0 ${
                          slot.id === activeSlot?.id ? 'bg-neo-cyan/15' : ''
                        } ${wordSolvedSlots.includes(slot.id) ? 'cw-capture-flash' : ''}`}
                      >
                        <span className="shrink-0 font-neo-display font-bold text-xs text-neo-cyan w-5 text-end">
                          {slot.number}
                        </span>
                        <span className="font-neo-body text-xs text-neo-white/90 truncate">{slot.clue || t('crossword.noClue')}</span>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAllClues(true)}
                    className="w-full flex items-center justify-center gap-1 px-3 py-2 font-neo-body text-xs text-neo-cyan hover:bg-neo-navy transition-colors"
                  >
                    {t('crossword.allClues')}
                    <ChevronDown size={14} />
                  </button>
                </div>
              ) : (
                <div className="fixed inset-0 z-40 bg-neo-navy/90 flex flex-col cw-mobile-clue-slide">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-black/10">
                    <h2 className="font-neo-display font-bold text-neo-white text-sm">{t('crossword.allClues')}</h2>
                    <button
                      type="button"
                      onClick={() => setShowAllClues(false)}
                      className="font-neo-body text-xs text-neo-cyan px-3 py-1 border-neo border-black rounded-neo"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 py-3">
                    <CrosswordClueList
                      slots={puzzle.slots}
                      activeSlotId={activeSlot?.id ?? null}
                      onSelect={(slot) => { focusSlot(slot.id); setShowAllClues(false); }}
                      t={t}
                      capturedSlotIds={solvedSlotIds(state)}
                      wordSolvedSlots={wordSolvedSlots}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile clue bar */}
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

          {/* On-screen keyboard */}
          <div className="shrink-0 pt-1 lg:hidden">
            <CrosswordKeyboard
              locale={puzzle.locale}
              onLetter={handleInput}
              onBackspace={backspace}
              disabled={solved}
              backspaceLabel={t('crossword.backspace')}
              usedLetters={usedLetters}
              correctLetters={correctLetters}
              wrongLetters={wrongLetters}
            />
          </div>
        </div>

        {/* Desktop clue rail */}
        <aside className="hidden lg:block lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto pe-0.5">
          <CrosswordClueList
            slots={puzzle.slots}
            activeSlotId={activeSlot?.id ?? null}
            onSelect={handleClueSelect}
            t={t}
            columns="stacked"
            capturedSlotIds={solvedSlotIds(state)}
            wordSolvedSlots={wordSolvedSlots}
          />
        </aside>
      </div>

      {/* Clue Scramble */}
      {pendingSlot && (
        <ClueScramble answer={pendingSlot.answer} onResult={handleScrambleResult} />
      )}

      {/* Streak badge — no emoji */}
      {clueStreak > 0 && (
        <div
          aria-label={t('crossword.scramble.streakAria', { count: clueStreak })}
          className="fixed top-4 end-4 z-[60] flex items-center gap-1 bg-neo-navy border-neo border-black rounded-neo shadow-hard px-2.5 py-1 font-neo-display font-bold text-neo-lime text-sm pointer-events-none"
        >
          <span aria-hidden>◆</span> {clueStreak}
        </div>
      )}

      {solved && (
              <CrosswordSolvedCard
                        elapsedMs={elapsedMs}
                        wordsTotal={stats.wordsTotal}
                        hintsUsed={hintsUsed}
                        soloAward={soloAward}
                        dailyModifier={dailyModifier}
                        onShare={handleShare}
                        onNewPuzzle={onNewPuzzle ?? (() => {})}
                        onPlayAgain={handleNext}
                        onReset={reset}
                        onDismiss={reset}
                        t={t}
                      />
            )}

      <CrosswordFx burstKey={burst} />
    </div>
  );
}