'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCheck, Eye, RotateCcw, Lightbulb } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useCrosswordGame } from '@/hooks/useCrosswordGame';
import type { CrosswordPuzzle } from '@/lib/crossword/types';
import { CrosswordGrid } from './CrosswordGrid';
import { CrosswordKeyboard } from './CrosswordKeyboard';
import { ClueBar } from './ClueBar';
import { CrosswordClueList } from './CrosswordClueList';
import { CrosswordFx } from './CrosswordFx';

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export interface CrosswordViewProps {
  puzzle: CrosswordPuzzle;
}

export function CrosswordView({ puzzle }: CrosswordViewProps) {
  const { t } = useLanguage();
  const reduced = useReducedMotion();
  const [burst, setBurst] = useState(0);
  const game = useCrosswordGame(puzzle, { onSolved: () => setBurst((n) => n + 1) });
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

  return (
    <div className="flex flex-col gap-4 items-stretch w-full max-w-[36rem] mx-auto px-3 py-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-neo-display font-extrabold text-xl text-neo-cyan">
          {t('crossword.title')}
        </h1>
        <div
          className="font-neo-display font-bold text-lg text-neo-white tabular-nums"
          aria-label={t('crossword.timer')}
        >
          {formatTime(elapsedMs)}
        </div>
      </div>

      <CrosswordGrid state={state} onSelect={focusCell} t={t} />

      <ClueBar
        slot={activeSlot}
        rtl={puzzle.rtl}
        onPrev={() => nextSlot(-1)}
        onNext={() => nextSlot(1)}
        onToggleDir={toggleDir}
        t={t}
      />

      {/* Toolbar */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <ToolButton onClick={checkAll} icon={<CheckCheck size={16} />} label={t('crossword.check')} />
        <ToolButton onClick={handleReveal} icon={<Lightbulb size={16} />} label={t('crossword.revealLetter')} />
        <ToolButton onClick={revealWord} icon={<Eye size={16} />} label={t('crossword.revealWord')} />
        <ToolButton onClick={reset} icon={<RotateCcw size={16} />} label={t('crossword.restart')} />
      </div>

      <CrosswordKeyboard
        locale={puzzle.locale}
        onLetter={inputLetter}
        onBackspace={backspace}
        disabled={solved}
        backspaceLabel={t('crossword.backspace')}
      />

      <CrosswordClueList
        slots={puzzle.slots}
        activeSlotId={activeSlot?.id ?? null}
        onSelect={(slot) => focusSlot(slot.id)}
        t={t}
      />

      {solved && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neo-navy/70 p-6">
          <div
            ref={overlayRef}
            className="bg-neo-cyan text-neo-navy border-neo-thick border-black rounded-neo shadow-hard-lg px-8 py-7 text-center max-w-sm"
          >
            <div className="text-4xl mb-2" aria-hidden>
              🎉
            </div>
            <h2 className="font-neo-display font-extrabold text-2xl mb-1">
              {t('crossword.solvedTitle')}
            </h2>
            <p className="font-neo-body font-medium mb-4">
              {t('crossword.solvedTime')} {formatTime(elapsedMs)}
            </p>
            <button
              type="button"
              onClick={reset}
              className="font-neo-display font-bold bg-neo-navy text-neo-white border-neo border-black rounded-neo shadow-hard px-5 py-2.5 active:translate-y-[1px]"
            >
              {t('crossword.playAgain')}
            </button>
          </div>
        </div>
      )}

      <CrosswordFx burstKey={burst} />
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
