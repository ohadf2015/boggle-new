'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { m } from 'framer-motion';
import { Coins, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { fireConfetti, fireFireworks, fireVictoryConfetti } from '@/utils/confettiUtils';
import { triggerHaptic } from '@/utils/hapticFeedback';
import { emitCoinEarned } from '@/utils/coinEarnedFx';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { dayPrizeOddsPct, type DayPrizeClaimResponse, type DayPrizeKind, type DayPrizeTier } from '@/lib/daily/dayPrize';
import { claimDayPrize, fetchDayPrizeFixed, readOpenedPrize } from './dayPrizeStore';
import ChestPartPrize from '@/components/avatar/chest/ChestPartPrize';
import ChestPartOdds from '@/components/avatar/chest/ChestPartOdds';
import { isChestPartDrop, type ChestDropSource } from '@/lib/avatar/chestDrops';

const PART_SOURCE: Record<DayPrizeKind, ChestDropSource> = { clear: 'day_clear', perfect: 'day_perfect' };

/** Closed box shakes at least this long, so the server answer never makes the reveal feel instant. */
export const ANTICIPATION_MS = 750;
/** Wait before asking again when the server has not seen today's score yet. */
export const RETRY_MS = 1500;

const CHEST_ART: Record<DayPrizeTier | 'closed', string> = {
  closed: '/daily/chests/chest-silver.jpg',
  common: '/daily/chests/chest-bronze.jpg',
  lucky: '/daily/chests/chest-silver.jpg',
  jackpot: '/daily/chests/chest-gold.jpg',
};

const TIER_STYLE: Record<DayPrizeTier, { stamp: string; ring: string }> = {
  common: { stamp: 'bg-neo-cream text-neo-black', ring: 'shadow-[4px_4px_0_black]' },
  lucky: { stamp: 'bg-neo-cyan text-neo-black', ring: 'shadow-[4px_4px_0_black,0_0_28px_rgba(0,255,255,0.45)]' },
  jackpot: { stamp: 'bg-neo-yellow text-neo-black', ring: 'shadow-[4px_4px_0_black,0_0_40px_rgba(255,225,53,0.6)]' },
};

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Bigger box, bigger party: each tier celebrates differently so the payoff reads before the number does. */
function celebrate(tier: DayPrizeTier): void {
  if (tier === 'jackpot') {
    fireFireworks(3, 1800);
    triggerHaptic('heavy');
  } else if (tier === 'lucky') {
    fireVictoryConfetti();
    triggerHaptic('success');
  } else {
    fireConfetti({ particleCount: 18, spread: 55, origin: { y: 0.55 }, startVelocity: 35 });
    triggerHaptic('medium');
  }
}

type Phase = 'closed' | 'opening' | 'open' | 'not-cleared' | 'failed';

interface DayPrizeRevealProps {
  kind: DayPrizeKind;
  onClose: () => void;
  /** Analytics source, e.g. `word_hunt_results` or `hub`. */
  source: string;
}

/**
 * The daily prize box: a closed chest the player taps to open. It shakes while
 * the server rolls, then lands on one of three tiers, each with its own chest,
 * stamp and celebration; one small line states the odds. The education side
 * gets a fixed amount instead: no shake, no stamp, no odds. Coins fly to the
 * HUD counter when they pay.
 */
export function DayPrizeReveal({ kind, onClose, source }: DayPrizeRevealProps) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<Phase>(() => (readOpenedPrize(kind) ? 'open' : 'closed'));
  const [prize, setPrize] = useState<DayPrizeClaimResponse | null>(() => readOpenedPrize(kind));
  const coinsRef = useRef<HTMLSpanElement>(null);
  const [reduced] = useState(reducedMotion);
  // Fixed (education side) or random? Unknown until the server says: the odds
  // line waits for the answer so it never flashes on a fixed box.
  const [fixedMode, setFixedMode] = useState<boolean | null>(() => readOpenedPrize(kind)?.fixed ?? null);
  const mounted = useRef(true);
  // True only for the open that just happened here (not a reopened, cached box).
  const [freshOpen, setFreshOpen] = useState(false);

  useEffect(() => {
    mounted.current = true;
    const opened = readOpenedPrize(kind);
    let cancelled = false;
    const announce = (fixed: boolean) => trackGrowthEvent('day_prize_shown', { kind, source, edu_fixed_prize: fixed });
    if (opened) announce(!!opened.fixed);
    else void fetchDayPrizeFixed(kind).then((fixed) => {
      if (cancelled) return;
      setFixedMode(fixed);
      announce(fixed === true);
    });
    return () => {
      cancelled = true;
      mounted.current = false;
    };
  }, [kind, source]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const open = useCallback(async () => {
    setPhase('opening');
    triggerHaptic('light');
    // The fixed box has nothing to roll, so nothing to build up to.
    const wait = new Promise((resolve) => setTimeout(resolve, reduced || fixedMode === true ? 0 : ANTICIPATION_MS));
    let [outcome] = await Promise.all([claimDayPrize(kind), wait]);
    // Straight off a results screen the score may still be saving: give it one more beat.
    if (!outcome.ok && outcome.reason === 'not-cleared') {
      await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
      if (!mounted.current) return;
      outcome = await claimDayPrize(kind);
    }
    if (!mounted.current) return;
    if (!outcome.ok) {
      setPhase(outcome.reason);
      return;
    }
    setPrize(outcome.prize);
    setFreshOpen(outcome.prize.claimed);
    setFixedMode(!!outcome.prize.fixed);
    setPhase('open');
    celebrate(outcome.prize.tier);
    trackGrowthEvent('day_prize_opened', {
      kind,
      source,
      tier: outcome.prize.tier,
      coins: outcome.prize.coins,
      first_open: outcome.prize.claimed,
      edu_fixed_prize: !!outcome.prize.fixed,
    });
    if (outcome.prize.claimed) {
      const rect = coinsRef.current?.getBoundingClientRect();
      const origin = rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined;
      emitCoinEarned(outcome.prize.coins, origin, { big: outcome.prize.tier !== 'common' });
    }
  }, [kind, reduced, source, fixedMode]);

  if (typeof document === 'undefined') return null;

  const tier = phase === 'open' && prize ? prize.tier : null;
  const art = CHEST_ART[tier ?? 'closed'];
  const fixed = prize?.fixed ?? fixedMode === true;
  const odds = dayPrizeOddsPct();
  // Random box only, and only once the server said so (never on the education side).
  const oddsLine = (prize ? !prize.fixed : fixedMode === false) ? (
    <>
      <p data-testid="day-prize-odds" className="text-[11px] font-bold text-neo-white/60">{t('daily.dayPrize.odds', odds)}</p>
      <ChestPartOdds source={PART_SOURCE[kind]} />
    </>
  ) : null;
  const spring = { type: 'spring', stiffness: 420, damping: 18 } as const;

  return createPortal(
    // Static backdrop: a fullscreen opacity tween flashes on mobile Chromium (rules/60 Class 5).
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="day-prize-title"
      data-testid="day-prize-reveal"
      data-phase={phase}
      data-tier={tier ?? undefined}
      className="fixed inset-0 z-80 flex items-center justify-center bg-neo-navy/90 px-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && phase !== 'opening') onClose();
      }}
    >
      <m.div
        className="w-full max-w-sm rounded-2xl border-3 border-neo-black bg-neo-navy-light shadow-hard-lg p-5 flex flex-col items-center gap-3 text-center"
        initial={reduced ? false : { scale: 0.6, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        transition={spring}
      >
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-neo-lime">
          {t(kind === 'perfect' ? 'daily.dayPrize.titlePerfect' : 'daily.dayPrize.title')}
        </p>

        <m.button
          type="button"
          key={tier ?? 'closed'}
          data-testid="day-prize-chest"
          aria-label={t('daily.dayPrize.open')}
          disabled={phase !== 'closed'}
          onClick={open}
          className={cn(
            'relative w-40 h-40 rounded-2xl border-3 border-neo-black overflow-hidden bg-neo-navy',
            tier ? TIER_STYLE[tier].ring : 'shadow-[4px_4px_0_black]',
            phase === 'closed' && 'cursor-pointer',
          )}
          initial={reduced || !tier ? false : { scale: 0.4, rotate: -8 }}
          animate={
            phase === 'opening' && !reduced && !fixed
              ? { rotate: [0, -7, 7, -9, 9, -5, 0], scale: [1, 1.04, 1, 1.06, 1, 1.08, 1.1] }
              : { scale: 1, rotate: 0 }
          }
          transition={phase === 'opening' && !fixed ? { duration: ANTICIPATION_MS / 1000, repeat: Infinity } : spring}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- 160px decorative chest art */}
          <img src={art} alt="" className="w-full h-full object-cover" draggable={false} />
          {phase === 'closed' && (
            <span aria-hidden className="absolute inset-x-0 bottom-0 py-1 bg-neo-black/70 text-neo-yellow text-xs font-black uppercase tracking-wide">
              {t('daily.dayPrize.tapToOpen')}
            </span>
          )}
        </m.button>

        {tier && prize ? (
          <>
            {!fixed && <m.span
              data-testid="day-prize-stamp"
              className={cn('px-3 py-1 rounded-md border-3 border-neo-black font-neo-display font-black text-lg uppercase -rotate-3', TIER_STYLE[tier].stamp)}
              initial={reduced ? false : { scale: 2.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ ...spring, delay: 0.1 }}
            >
              {t(`daily.dayPrize.tier.${tier}`)}
            </m.span>}
            <h2 id="day-prize-title" className="flex items-center gap-2 font-neo-display font-black text-3xl text-neo-white">
              <Coins className="w-7 h-7 text-neo-yellow" aria-hidden />
              <span ref={coinsRef} data-testid="day-prize-coins">{t('daily.dayPrize.coins', { coins: prize.coins })}</span>
            </h2>
            <p className="text-xs font-black text-neo-lime">{t('daily.dayPrize.xp', { xp: prize.xp })}</p>
            {isChestPartDrop(prize.part) ? (
              <ChestPartPrize drop={prize.part} source={PART_SOURCE[kind]} autoReveal={freshOpen} />
            ) : (
              <p className="text-sm font-bold text-neo-cream" data-testid="day-prize-line">{t('daily.dayPrize.todayLine')}</p>
            )}
            {oddsLine}
            <button
              type="button"
              data-testid="day-prize-collect"
              onClick={onClose}
              className="mt-1 w-full h-12 rounded-xl border-3 border-neo-black bg-neo-lime text-neo-black font-black uppercase shadow-hard-sm active:translate-y-0.5 active:shadow-none"
            >
              {t('daily.dayPrize.collect')}
            </button>
          </>
        ) : (
          <>
            <h2 id="day-prize-title" className="font-neo-display font-black text-2xl text-neo-white">
              {phase === 'not-cleared'
                ? t('daily.dayPrize.notYet')
                : phase === 'failed'
                  ? t('daily.dayPrize.failed')
                  : t(kind === 'perfect' ? 'daily.dayPrize.readyPerfect' : 'daily.dayPrize.ready')}
            </h2>
            {phase === 'closed' && oddsLine}
            {phase === 'closed' || phase === 'opening' ? (
              <button
                type="button"
                data-testid="day-prize-open"
                onClick={open}
                disabled={phase === 'opening'}
                className="w-full h-12 rounded-xl border-3 border-neo-black bg-neo-yellow text-neo-black font-black uppercase shadow-hard-sm flex items-center justify-center gap-2 active:translate-y-0.5 active:shadow-none disabled:opacity-80"
              >
                <Sparkles className="w-5 h-5" aria-hidden />
                {phase === 'opening' ? t('daily.dayPrize.opening') : t('daily.dayPrize.open')}
              </button>
            ) : null}
            <button
              type="button"
              data-testid="day-prize-later"
              onClick={onClose}
              disabled={phase === 'opening'}
              className="min-h-11 px-4 text-xs font-bold text-neo-white/70 underline-offset-4 hover:underline"
            >
              {phase === 'closed' ? t('daily.dayPrize.later') : t('common.close')}
            </button>
          </>
        )}
      </m.div>
    </div>,
    document.body,
  );
}

export default DayPrizeReveal;
