'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { SoloRewardCard } from '@/components/solo/SoloRewardCard';
import type { Difficulty } from '@/lib/crossword/types';
import { formatTime } from './CrosswordProgressRow';

export interface CrosswordSolvedCardProps {
  t: (key: string, fallbackOrParams?: string | Record<string, string | number>) => string;
  language: Parameters<typeof SoloRewardCard>[0]['language'];
  elapsedMs: number;
  wordsTotal: number;
  hintsUsed: number;
  soloAward: { awarded: number; bonus: number; claimed: boolean } | null;
  dailyModifier: Parameters<typeof SoloRewardCard>[0]['modifier'];
  onNewPuzzle?: (difficulty?: Difficulty) => void;
  onReset: () => void;
  onNext: () => void;
}

export function CrosswordSolvedCard({
  t,
  language,
  elapsedMs,
  wordsTotal,
  hintsUsed,
  soloAward,
  dailyModifier,
  onNewPuzzle,
  onReset,
  onNext,
}: CrosswordSolvedCardProps) {
  const reduced = useReducedMotion();
  const overlayRef = useRef<HTMLDivElement>(null);

  // GSAP entrance for the solved card.
  useEffect(() => {
    if (reduced || !overlayRef.current) return;
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
  }, [reduced]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neo-navy/75 p-6">
      <div
        ref={overlayRef}
        className="bg-neo-cyan text-neo-navy border-neo-thick border-black rounded-neo shadow-hard-lg px-8 py-7 text-center max-w-sm w-full"
      >
        <div className="text-5xl mb-1" aria-hidden>
          🎉
        </div>
        <div className="relative">
          <h2 className="font-neo-display font-extrabold text-2xl mb-3">
            {t('crossword.solvedTitle')}
          </h2>
          <button
            type="button"
            onClick={onReset}
            aria-label={t('crossword.dismiss', 'Close')}
            className="absolute -top-2 -end-2 rounded-neo border-neo border-black bg-neo-navy-light px-2 py-1 font-neo-body text-xs font-bold text-neo-white shadow-hard active:translate-y-[1px] active:shadow-hard-pressed"
          >
            ✕
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <SolvedStat value={formatTime(elapsedMs)} label={t('crossword.timer')} />
          <SolvedStat value={`${wordsTotal}`} label={t('crossword.wordsLabel')} />
          <SolvedStat value={`${hintsUsed}`} label={t('crossword.hintsLabel')} />
        </div>
        {soloAward && (
          <SoloRewardCard
            t={t}
            language={language}
            awarded={soloAward.awarded}
            bonus={soloAward.bonus}
            modifier={dailyModifier}
            claimed={soloAward.claimed}
            onPlayAgain={onNext}
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
                onClick={onReset}
                className="mt-3 font-neo-body font-semibold text-xs text-neo-navy/70 underline underline-offset-2"
              >
                {t('crossword.playAgain')}
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={onReset}
            className="font-neo-display font-bold bg-neo-navy text-neo-white border-neo border-black rounded-neo shadow-hard px-6 py-2.5 active:translate-y-[1px] active:shadow-hard-pressed"
          >
            {t('crossword.playAgain')}
          </button>
        )}
      </div>
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
