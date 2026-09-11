/**
 * Homework finish screen — the payoff the old "mark complete" checkbox never had.
 *
 * Three beats, in this order: stars land, the class streak flame is handed over
 * ("you kept it alive"), then the share/turn-in actions. The streak comes from
 * the SERVER, so a classmate who finished on another phone this morning is
 * already counted — the whole point of moving it off localStorage.
 *
 * Confetti + fanfare fire once, and only when the run actually saved. A failed
 * save says so (pitfalls Class 4) instead of celebrating a lie.
 */
'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { Star, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { fireRankConfetti } from '@/utils/confettiUtils';
import { MASCOT_IMAGES } from '@/components/ui/mascotData';
import { MissGapStreakFlame } from './MissGapStreakFlame';
import { useMissGapSound } from './missGapSound';
import type { MissGapRunScore } from '@/lib/education/missGapQuiz';

export type SaveState = 'saving' | 'saved' | 'failed';

export interface MissGapCompletionProps {
  score: MissGapRunScore;
  streak: number;
  classmates: number;
  saveState: SaveState;
  onReplay: () => void;
  children?: React.ReactNode;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function MissGapCompletion({
  score,
  streak,
  classmates,
  saveState,
  onReplay,
  children,
}: MissGapCompletionProps) {
  const { t } = useLanguage();
  const playSound = useMissGapSound();
  const celebrated = useRef(false);

  useEffect(() => {
    if (celebrated.current || saveState === 'saving') return;
    celebrated.current = true;
    if (saveState !== 'saved') return;
    playSound('complete');
    if (!prefersReducedMotion()) {
      fireRankConfetti(score.stars >= 3 ? 1 : 2, score.stars >= 3 ? 'full' : 'light');
    }
  }, [saveState, score.stars, playSound]);

  return (
    <div
      data-testid="miss-gap-completion"
      className="flex flex-col h-full min-h-0 gap-3 text-center"
    >
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center gap-3 pt-1">
        <Image
          src={score.stars >= 3 ? MASCOT_IMAGES.trophyNobg : MASCOT_IMAGES.powerup}
          alt=""
          width={112}
          height={112}
          unoptimized
          aria-hidden
          className="w-24 h-24 drop-shadow-[4px_4px_0_rgba(0,0,0,0.4)]"
        />

        <div className="flex items-center gap-1.5" data-testid="miss-gap-stars">
          {[1, 2, 3].map((n) => (
            <Star
              key={n}
              aria-hidden
              className={cn(
                'w-10 h-10 stroke-[2.5]',
                n <= score.stars
                  ? 'fill-neo-yellow text-neo-black'
                  : 'fill-transparent text-neo-white/25',
              )}
            />
          ))}
        </div>
        <p className="sr-only">{t('education.homework.starsEarned', { stars: score.stars })}</p>

        <h2 className="font-neo-display font-bold text-2xl text-neo-white leading-tight">
          {score.stars >= 3
            ? t('education.homework.finishTitlePerfect')
            : t('education.homework.finishTitle')}
        </h2>

        <div className="grid grid-cols-2 gap-2 w-full">
          <p className="rounded-neo border-neo border-neo-black bg-neo-navy-light px-3 py-2">
            <span className="block font-neo-display font-bold text-2xl text-neo-cyan">
              {score.correct}/{score.total}
            </span>
            <span className="block font-neo-body text-[11px] uppercase tracking-wider text-neo-white/70">
              {t('education.homework.wordsRight')}
            </span>
          </p>
          <p className="rounded-neo border-neo border-neo-black bg-neo-navy-light px-3 py-2">
            <span className="block font-neo-display font-bold text-2xl text-neo-lime">
              {score.bestStreak}
            </span>
            <span className="block font-neo-body text-[11px] uppercase tracking-wider text-neo-white/70">
              {t('education.homework.bestRun')}
            </span>
          </p>
        </div>

        {saveState === 'failed' ? (
          <p
            data-testid="miss-gap-save-failed"
            className="w-full rounded-neo border-neo border-neo-black bg-neo-pink px-3 py-2 font-bold text-sm text-neo-black"
          >
            {t('education.homework.saveFailed')}
          </p>
        ) : (
          <>
            <MissGapStreakFlame streak={streak} size="hero" />
            {classmates > 0 ? (
              <p
                data-testid="miss-gap-classmates"
                className="font-neo-body text-sm text-neo-white/80"
              >
                {t('education.homework.classmates', { count: classmates })}
              </p>
            ) : (
              // First one in gets the bragging rights, not an empty "0 others".
              <p
                data-testid="miss-gap-classmates-first"
                className="font-neo-body text-sm text-neo-lime"
              >
                {t('education.homework.classmatesFirst')}
              </p>
            )}
          </>
        )}
      </div>

      <div className="shrink-0 space-y-2">
        {children}
        <button
          type="button"
          data-testid="miss-gap-replay"
          onClick={onReplay}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-3 font-bold',
            'bg-neo-cream text-neo-black border-neo border-neo-black rounded-neo shadow-hard-sm',
            'transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
          )}
        >
          <RotateCcw className="w-5 h-5" aria-hidden />
          {t('education.homework.playAgain')}
        </button>
      </div>
    </div>
  );
}
