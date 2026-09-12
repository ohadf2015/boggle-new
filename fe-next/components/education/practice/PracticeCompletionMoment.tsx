'use client';

/**
 * PracticeCompletionMoment — the payoff at the end of every solo practice round.
 *
 * Before this existed, seven practice modes ended on a flat card with a trophy
 * glyph and a percentage, and the only confetti anywhere in the practice stack
 * fired on a level-up — an event most rounds never reach. A student could
 * finish a perfect spelling round and be told about it in the same tone as a
 * form submission.
 *
 * Every mode now lands here instead: stars pop in one at a time, the mascot
 * reacts to how it went, a stinger plays, confetti fires on the good rounds,
 * the XP flies as coins into the bar at the top of the shell, and there is one
 * big NEXT (or AGAIN) rather than a link back to a grid of thirteen tiles.
 *
 * Class-5 safety: the card's resting state is fully painted — no fullscreen
 * opacity-from-0 entrance, no tween on the container. Only the small interior
 * elements (stars, mascot, XP chip) spring, and `useSkipAnimations()` turns
 * even those into a static appearance while leaving the sound intact, because
 * reduced motion is a motion preference, not a silence preference.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AdaptiveMotion, useSkipAnimations } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { fireVictoryConfetti, fireRankConfetti } from '@/utils/confettiUtils';
import { Mascot } from '@/components/ui/Mascot';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { cn } from '@/lib/utils';
import { ArrowRight, RotateCcw, Star, X, Zap } from 'lucide-react';
import { practiceCelebrationPlan, coinBurstCount } from '@/lib/education/practiceJuice';
import XpCoinFlight from './XpCoinFlight';
import { usePracticeCelebration } from './PracticeCelebrationContext';

export interface CompletionStat {
  /** Stable id — also the testid suffix. */
  key: string;
  label: string;
  value: string;
}

export interface PracticeCompletionMomentProps {
  correct: number;
  total: number;
  xpEarned?: number;
  /** Per-mode extras — words found, best streak, time, hints. */
  stats?: CompletionStat[];
  /** Replay this same mode. */
  onAgain: () => void;
  /** Jump straight into the next ready mode, when the picker offers one. */
  onNext?: () => void;
  /** Human name of the next mode, for the button label. */
  nextLabel?: string;
  /** Back to the picker. */
  onBack: () => void;
  className?: string;
}

const RANK_ACCENT: Record<string, string> = {
  gold: 'bg-neo-yellow',
  silver: 'bg-neo-cyan',
  bronze: 'bg-neo-lime',
};

export default function PracticeCompletionMoment({
  correct,
  total,
  xpEarned = 0,
  stats,
  onAgain,
  onNext,
  nextLabel,
  onBack,
  className,
}: PracticeCompletionMomentProps) {
  const { t, dir } = useLanguage();
  const { playSound } = useSoundEffects();
  const skipAnimations = useSkipAnimations();
  const xpChipRef = useRef<HTMLDivElement>(null);
  // One celebration per mounted card. Without this guard a parent re-render
  // (Class 2: an effect keyed on props that change after mount) would restack
  // the stinger on top of itself.
  const firedRef = useRef(false);
  const [coinsFlying, setCoinsFlying] = useState(0);

  const plan = useMemo(() => practiceCelebrationPlan(correct, total), [correct, total]);

  /*
    A level-up earned by THIS round belongs on this card, not in a modal on top
    of it. Claim it once, keep a local copy so the banner survives the claim,
    and tell the session it has been shown so `LevelUpCelebration` stays shut.
  */
  const { levelUp, acknowledge } = usePracticeCelebration();
  const [claimedLevel, setClaimedLevel] = useState<number | null>(null);
  const claimedRef = useRef(false);
  useEffect(() => {
    if (claimedRef.current || !levelUp) return;
    claimedRef.current = true;
    setClaimedLevel(levelUp.newLevel);
    acknowledge();
  }, [levelUp, acknowledge]);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    // `requiresGameActive: false` is mandatory here: practice screens never
    // call setGameActive(true), so the default-gated playSound would no-op and
    // the whole celebration would be silent.
    playSound(plan.sound, { requiresGameActive: false, volume: 0.7 });

    if (skipAnimations) return;
    if (plan.confetti === 'victory') fireVictoryConfetti();
    else if (plan.confetti === 'rank') fireRankConfetti(2, 'light');
  }, [plan, playSound, skipAnimations]);

  // Coins launch a beat after the card lands, so the stars read first.
  useEffect(() => {
    if (skipAnimations) return;
    const burst = coinBurstCount(xpEarned);
    if (burst === 0) return;
    const timer = setTimeout(() => setCoinsFlying(burst), 450);
    return () => clearTimeout(timer);
  }, [xpEarned, skipAnimations]);

  const handleCoinsLanded = useCallback(() => {
    playSound('coinCollect', { requiresGameActive: false, volume: 0.45 });
  }, [playSound]);

  const headline = plan.perfect
    ? t('student.practiceFun.headline.perfect')
    : t(`student.practiceFun.headline.${plan.rank}`);

  return (
    <div
      data-testid="practice-completion"
      data-rank={plan.rank}
      dir={dir}
      className={cn(
        'relative mx-auto w-full max-w-sm overflow-hidden rounded-neo border-[3px] border-neo-cream bg-neo-navy-light shadow-hard-lg',
        className
      )}
    >
      <span className={cn('block h-2.5 w-full', RANK_ACCENT[plan.rank])} aria-hidden="true" />

      {/* Leaving is chrome, not a third button competing with the payoff. */}
      <button
        type="button"
        data-testid="practice-completion-exit"
        onClick={onBack}
        aria-label={t('student.practiceFun.allGames')}
        className="absolute end-2 top-4 flex h-9 w-9 items-center justify-center rounded-neo border-[2px] border-neo-cream bg-neo-navy text-neo-cream transition-colors hover:bg-neo-navy-light"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="flex flex-col items-center gap-3 px-5 py-5 text-center">
        {/* Stars — the headline result, read before any number. */}
        <div
          data-testid="practice-completion-stars"
          data-stars={plan.stars}
          className="flex items-center justify-center gap-1.5"
          role="img"
          aria-label={t('student.practiceFun.starsEarned', { count: plan.stars })}
        >
          {[1, 2, 3].map((slot) => {
            const filled = slot <= plan.stars;
            return (
              <AdaptiveMotion.div
                key={slot}
                {...(filled ? { 'data-testid': `practice-completion-star-${slot}` } : {})}
                initial={{ scale: 0.2, rotate: -25 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.12 * slot, type: 'spring', stiffness: 380, damping: 13 }}
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-neo border-[3px] border-black',
                  filled ? 'bg-neo-yellow shadow-hard-sm' : 'bg-neo-navy/60 border-black/40'
                )}
              >
                <Star
                  className={cn('h-6 w-6', filled ? 'fill-black text-black' : 'text-neo-white/25')}
                  aria-hidden="true"
                />
              </AdaptiveMotion.div>
            );
          })}
        </div>

        <h2 className="font-neo-display text-2xl font-black uppercase leading-none text-neo-white text-balance">
          {headline}
        </h2>

        {/* Mascot reacts to the rank — celebration, trophy or a pat on the back. */}
        <Mascot variant={plan.mascot} size="sm" animated clipBorder="none" />

        <p className="font-neo-body text-sm font-bold text-neo-white/85 tabular-nums">
          {t('student.practiceFun.scoreLine', { correct, total, percent: plan.percent })}
        </p>

        {xpEarned > 0 && (
          <AdaptiveMotion.div
            ref={xpChipRef}
            data-testid="practice-completion-xp"
            initial={{ scale: 0.6 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.42, type: 'spring', stiffness: 420, damping: 14 }}
            className="inline-flex items-center gap-1.5 rounded-neo border-[3px] border-black bg-neo-yellow px-3 py-1.5 shadow-hard-sm"
          >
            <Zap className="h-4 w-4 fill-black text-black" aria-hidden="true" />
            <span className="font-neo-display text-base font-black tabular-nums text-black">
              {t('student.practiceFun.xpGain', { xp: xpEarned })}
            </span>
          </AdaptiveMotion.div>
        )}

        {claimedLevel !== null && (
          <AdaptiveMotion.div
            data-testid="practice-completion-levelup"
            initial={{ scale: 0.7 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 400, damping: 13 }}
            className="flex w-full items-center justify-center gap-2 rounded-neo border-[3px] border-black bg-neo-yellow px-3 py-2 shadow-hard-sm"
          >
            <Star className="h-4 w-4 fill-black text-black" aria-hidden="true" />
            <span className="font-neo-display text-base font-black uppercase text-black">
              {t('student.practiceFun.levelUp', { level: claimedLevel })}
            </span>
          </AdaptiveMotion.div>
        )}

        {stats && stats.length > 0 && (
          <div className="grid w-full grid-cols-2 gap-2">
            {stats.map((stat) => (
              <div
                key={stat.key}
                data-testid={`practice-completion-stat-${stat.key}`}
                className="rounded-neo border-[2px] border-black/50 bg-black/25 px-2 py-1.5"
              >
                <p className="font-neo-display text-lg font-black tabular-nums leading-none text-neo-cyan">
                  {stat.value}
                </p>
                <p className="mt-0.5 font-neo-body text-[11px] font-bold leading-tight text-neo-cream">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/*
          ONE dominant action. NEXT when the lesson has somewhere to go, AGAIN
          otherwise — and the only other choice is half the width and half the
          type size beneath it, so the eye never has to rank two equals.
        */}
        <div data-testid="practice-completion-actions" className="mt-1 flex w-full flex-col items-center gap-2">
          <button
            type="button"
            data-primary="true"
            data-testid={onNext ? 'practice-completion-next' : 'practice-completion-again'}
            onClick={onNext ?? onAgain}
            className="flex min-h-[58px] w-full items-center justify-center gap-2 rounded-neo border-[3px] border-black bg-neo-lime px-4 font-neo-display text-xl font-black uppercase text-black shadow-hard transition-all hover:shadow-hard-lg active:translate-y-[2px] active:shadow-hard-pressed"
          >
            {onNext ? (
              <>
                {nextLabel
                  ? t('student.practiceFun.nextMode', { mode: nextLabel })
                  : t('student.practiceFun.next')}
                <DirectionalIcon icon={ArrowRight} className="h-5 w-5" />
              </>
            ) : (
              <>
                <RotateCcw className="h-5 w-5" aria-hidden="true" />
                {t('student.practiceFun.again')}
              </>
            )}
          </button>

          {onNext && (
            <button
              type="button"
              data-testid="practice-completion-again"
              onClick={onAgain}
              className="flex min-h-[40px] w-3/5 items-center justify-center gap-1.5 rounded-neo border-[2px] border-neo-cream bg-neo-navy px-3 font-neo-body text-xs font-bold uppercase text-neo-cream transition-colors hover:bg-neo-navy-light"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              {t('student.practiceFun.again')}
            </button>
          )}
        </div>
      </div>

      {coinsFlying > 0 && (
        <XpCoinFlight count={coinsFlying} originRef={xpChipRef} onLanded={handleCoinsLanded} />
      )}
    </div>
  );
}
