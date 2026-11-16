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

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { AdaptiveMotion, useSkipAnimations } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { fireVictoryConfetti, fireRankConfetti } from '@/utils/confettiUtils';
import { Mascot } from '@/components/ui/Mascot';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { cn } from '@/lib/utils';
import { ArrowRight, RotateCcw, Star, X, Zap } from 'lucide-react';
import { practiceCelebrationPlan, coinBurstCount } from '@/lib/education/practiceJuice';
import CoinFlight from '@/components/education/rewards/CoinFlight';
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
  /** A quieter follow-up under the actions (e.g. the words to review). */
  footer?: ReactNode;
  /** A status line under the headline (e.g. homework confirmed done). */
  badge?: ReactNode;
  className?: string;
}

const RANK_ACCENT: Record<string, string> = {
  gold: 'bg-neo-yellow',
  silver: 'bg-neo-cyan',
  bronze: 'bg-neo-lime',
};

/* The card's colour comes from the rank: a glow behind the stars, a matching
   hard shadow, and sun rays behind the mascot. Static gradients, no blur. */
const RANK_HUE: Record<string, string> = {
  gold: 'var(--neo-yellow)',
  silver: 'var(--neo-cyan)',
  bronze: 'var(--neo-lime)',
};
const RANK_SHADOW: Record<string, string> = {
  gold: 'shadow-hard-yellow-xl',
  silver: 'shadow-hard-cyan-xl',
  bronze: 'shadow-hard-lime-xl',
};

/* A filled star is a chunky gold key (the same candy face as the letter tiles). */
const STAR_KEY: CSSProperties = {
  background: '#FFD32A',
  border: '3px solid #0b1530',
  boxShadow: '0 4px 0 0 #0b1530, inset 0 3px 0 rgba(255,255,255,0.6), inset 0 -6px 0 #C98A00',
};

/** Count up from 0 to `to` over ~`ms`; lands on `to` at once when motion is skipped. */
function useCountUp(to: number, ms: number, skip: boolean, delayMs = 0): number {
  const [value, setValue] = useState(skip ? to : 0);
  useEffect(() => {
    if (skip || typeof requestAnimationFrame !== 'function') {
      setValue(to);
      return;
    }
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now + delayMs;
      const k = Math.min(1, Math.max(0, (now - start) / ms));
      setValue(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms, skip, delayMs]);
  return value;
}

export default function PracticeCompletionMoment({
  correct,
  total,
  xpEarned = 0,
  stats,
  onAgain,
  onNext,
  nextLabel,
  onBack,
  footer,
  badge,
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

  const shownCorrect = useCountUp(correct, 700, skipAnimations, 350);
  const shownPercent = useCountUp(plan.percent, 700, skipAnimations, 350);

  const headline = plan.perfect
    ? t('student.practiceFun.headline.perfect')
    : t(`student.practiceFun.headline.${plan.rank}`);

  return (
    <div
      data-testid="practice-completion"
      data-rank={plan.rank}
      dir={dir}
      className={cn(
        'relative mx-auto w-full max-w-sm overflow-hidden rounded-neo border-[3px] border-neo-cream bg-neo-navy-light',
        RANK_SHADOW[plan.rank],
        className
      )}
      style={{
        backgroundImage: `radial-gradient(90% 45% at 50% 0%, color-mix(in srgb, ${RANK_HUE[plan.rank]} 30%, transparent), transparent 75%)`,
      }}
    >
      <style>{'@keyframes lc-rays{to{transform:rotate(360deg)}}@keyframes lc-cta-breathe{0%,100%{scale:1}50%{scale:1.03}}'}</style>
      <span className={cn('block h-2.5 w-full', RANK_ACCENT[plan.rank])} aria-hidden="true" />

      {/* Leaving is chrome, not a third button competing with the payoff. */}
      <button
        type="button"
        data-testid="practice-completion-exit"
        onClick={onBack}
        aria-label={t('student.practiceFun.allGames')}
        className="absolute end-2 top-3 flex h-11 w-11 items-center justify-center rounded-neo border-[2px] border-neo-cream bg-neo-navy text-neo-cream transition-colors hover:bg-neo-navy-light focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="flex flex-col items-center gap-3 px-5 py-5 text-center">
        {/* Stars — the headline result, read before any number. */}
        <div
          data-testid="practice-completion-stars"
          data-stars={plan.stars}
          className="flex items-end justify-center gap-2 pt-1"
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
                style={filled ? STAR_KEY : undefined}
                className={cn(
                  // A game-style rating: the middle star sits higher and larger.
                  'flex items-center justify-center rounded-2xl',
                  slot === 2 ? 'mb-2 h-16 w-16' : 'h-[52px] w-[52px]',
                  !filled && 'border-[3px] border-dashed border-neo-cream/35 bg-neo-black/20'
                )}
              >
                <Star
                  className={cn(slot === 2 ? 'h-9 w-9' : 'h-7 w-7', filled ? 'fill-neo-navy text-neo-navy' : 'text-neo-white/35')}
                  aria-hidden="true"
                />
              </AdaptiveMotion.div>
            );
          })}
        </div>

        <h2 className="font-neo-display text-2xl font-black uppercase leading-none text-neo-white text-balance">
          {headline}
        </h2>
        {badge}

        {/* Mascot reacts to the rank — celebration, trophy or a pat on the back.
            Every rank sits in the same round frame: the gold and silver art carry
            a dark square of their own that showed as a box on this card, while
            the bronze art was already circled. */}
        <div className="relative flex items-center justify-center">
          <span
            aria-hidden="true"
            data-testid="practice-completion-rays"
            className="pointer-events-none absolute left-1/2 top-1/2 size-56 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-45 motion-safe:animate-[lc-rays_14s_linear_infinite]"
            style={{
              background: `repeating-conic-gradient(from 0deg, ${RANK_HUE[plan.rank]} 0deg 9deg, transparent 9deg 22deg)`,
              maskImage: 'radial-gradient(circle, #000 35%, transparent 70%)',
              WebkitMaskImage: 'radial-gradient(circle, #000 35%, transparent 70%)',
            }}
          />
          <Mascot variant={plan.mascot} size="sm" animated clipShape="circle" clipBorder="pink" className="relative" />
        </div>

        {/* The score counts up as the card lands; the final line is what assistive tech reads. */}
        <p className="font-neo-display text-lg font-black text-neo-white tabular-nums">
          <span className="sr-only">{t('student.practiceFun.scoreLine', { correct, total, percent: plan.percent })}</span>
          <span aria-hidden="true" data-testid="practice-completion-score">
            {t('student.practiceFun.scoreLine', { correct: shownCorrect, total, percent: shownPercent })}
          </span>
        </p>

        {xpEarned > 0 && (
          <AdaptiveMotion.div
            ref={xpChipRef}
            data-testid="practice-completion-xp"
            initial={{ scale: 0.6 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.42, type: 'spring', stiffness: 420, damping: 14 }}
            className="inline-flex items-center gap-1.5 rounded-neo border-[3px] border-neo-black bg-neo-yellow px-3 py-1.5 shadow-hard-sm"
          >
            <Zap className="h-4 w-4 fill-neo-black text-neo-black" aria-hidden="true" />
            <span className="font-neo-display text-base font-black tabular-nums text-neo-black">
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
            className="flex w-full items-center justify-center gap-2 rounded-neo border-[3px] border-neo-black bg-neo-yellow px-3 py-2 shadow-hard-sm"
          >
            <Star className="h-4 w-4 fill-neo-black text-neo-black" aria-hidden="true" />
            <span className="font-neo-display text-base font-black uppercase text-neo-black">
              {t('student.practiceFun.levelUp', { level: claimedLevel })}
            </span>
          </AdaptiveMotion.div>
        )}

        {stats && stats.length > 0 && (
          // Two per row, and an odd one out sits centred: a lone "Time" tile used to
          // hug the start edge of a two-column grid with an empty cell beside it.
          <div data-testid="practice-completion-stats" className="flex w-full flex-wrap justify-center gap-2">
            {stats.map((stat) => (
              <div
                key={stat.key}
                data-testid={`practice-completion-stat-${stat.key}`}
                className="basis-[calc(50%-0.25rem)] rounded-neo border-[2px] border-neo-cream/40 bg-neo-black/25 px-2 py-1.5"
              >
                <p className="font-neo-display text-lg font-black tabular-nums leading-none text-neo-cyan">
                  {stat.value}
                </p>
                <p className="mt-0.5 font-neo-body text-xs font-bold leading-tight text-neo-cream">
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
            className="flex min-h-[58px] w-full items-center justify-center gap-2 rounded-neo border-[3px] border-neo-black bg-neo-lime px-4 font-neo-display text-xl font-black uppercase text-neo-black shadow-[0_6px_0_0_#0b1530,inset_0_2px_0_rgba(255,255,255,0.55),inset_0_-5px_0_rgba(0,0,0,0.18)] transition active:translate-y-[5px] active:shadow-[0_1px_0_0_#0b1530] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan motion-safe:animate-[lc-cta-breathe_2.4s_ease-in-out_1.2s_infinite]"
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
              className="flex min-h-11 w-3/5 items-center justify-center gap-1.5 rounded-neo border-[2px] border-neo-cream bg-neo-navy px-3 font-neo-body text-sm font-bold uppercase text-neo-cream transition-colors hover:bg-neo-navy-light focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              {t('student.practiceFun.again')}
            </button>
          )}
          {footer}
        </div>
      </div>

      {coinsFlying > 0 && (
        <CoinFlight count={coinsFlying} fromRef={xpChipRef} toSelector="[data-xp-flight-target]" size={22} onDone={handleCoinsLanded} />
      )}
    </div>
  );
}
