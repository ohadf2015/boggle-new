'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { m } from 'framer-motion';
import { Gift } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { CoinArt } from '@/components/ui/CoinArt';
import { fireFireworks, fireVictoryConfetti } from '@/utils/confettiUtils';
import { triggerHaptic } from '@/utils/hapticFeedback';
import { emitCoinEarned } from '@/utils/coinEarnedFx';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { claimStreakMilestoneRequest } from '@/lib/daily/streakClient';
import type { StreakMilestone } from '@/lib/daily/streakRewards';
import { StreakFlame } from './StreakFlame';

type Phase = 'ready' | 'claiming' | 'paid' | 'failed';

interface StreakMilestoneRevealProps {
  milestone: StreakMilestone;
  /** Analytics source, e.g. `word_wheel_results` or `daily_hub`. */
  source: string;
  onClose: () => void;
  onClaimed?: () => void;
}

const reducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** The milestone moment: the mascot on fire, the tier's flame, one big claim button. */
export function StreakMilestoneReveal({ milestone, source, onClose, onClaimed }: StreakMilestoneRevealProps) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<Phase>('ready');
  const coinsRef = useRef<HTMLSpanElement>(null);
  const mounted = useRef(true);
  const [reduced] = useState(reducedMotion);

  useEffect(() => {
    mounted.current = true;
    trackGrowthEvent('streak_milestone_shown', { days: milestone.days, coins: milestone.coins, source });
    return () => {
      mounted.current = false;
    };
  }, [milestone.days, milestone.coins, source]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const claim = useCallback(async () => {
    setPhase('claiming');
    triggerHaptic('light');
    const outcome = await claimStreakMilestoneRequest();
    if (!mounted.current) return;
    if (!outcome.ok) {
      setPhase('failed');
      trackGrowthEvent('streak_milestone_claimed', { days: milestone.days, source, result: outcome.reason });
      return;
    }
    setPhase('paid');
    trackGrowthEvent('streak_milestone_claimed', { days: outcome.days, coins: outcome.coins, source, result: outcome.claimed ? 'paid' : 'repeat' });
    if (outcome.claimed) {
      if (outcome.days >= 30) fireFireworks(3, 1800);
      else fireVictoryConfetti();
      triggerHaptic('success');
      const rect = coinsRef.current?.getBoundingClientRect();
      emitCoinEarned(outcome.coins, rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined, { big: true });
    }
    onClaimed?.();
  }, [milestone.days, source, onClaimed]);

  if (typeof document === 'undefined') return null;
  const spring = { type: 'spring', stiffness: 420, damping: 18 } as const;

  return createPortal(
    // Static backdrop: a fullscreen opacity tween flashes on mobile Chromium.
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="streak-milestone-title"
      data-testid="streak-milestone-reveal"
      data-phase={phase}
      className="fixed inset-0 z-80 flex items-center justify-center bg-neo-navy/90 px-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && phase !== 'claiming') onClose();
      }}
    >
      <m.div
        className="relative flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border-[3px] border-neo-orange bg-neo-navy-light p-5 pt-6 text-center shadow-hard-lg"
        initial={reduced ? false : { scale: 0.6, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        transition={spring}
      >
        <p className="font-neo-display text-[11px] font-black uppercase tracking-[0.2em] text-neo-orange">
          {t('dailyStreak.flame.milestoneEyebrow')}
        </p>
        <div className="relative flex items-end justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- small decorative mascot */}
          <img src="/mascot/onfire-nobg.webp" alt="" width={112} height={112} className="-me-4 h-28 w-28 object-contain" draggable={false} />
          <StreakFlame days={milestone.days} size={104} />
        </div>
        <h2 id="streak-milestone-title" className="font-neo-display text-3xl font-black uppercase leading-none text-neo-cream">
          {t('dailyStreak.flame.milestoneTitle', { days: milestone.days })}
        </h2>
        <p className="font-neo-body text-sm font-medium text-neo-white/75">{t('dailyStreak.flame.milestoneBody', { days: milestone.days })}</p>

        {phase === 'paid' ? (
          <>
            <m.span
              data-testid="streak-milestone-paid"
              className="flex items-center gap-2 font-neo-display text-3xl font-black text-neo-yellow"
              initial={reduced ? false : { scale: 2, rotate: -6 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={spring}
            >
              <CoinArt size={30} />
              <span ref={coinsRef}>{t('dailyStreak.flame.paid', { coins: milestone.coins })}</span>
            </m.span>
            <button
              type="button"
              data-testid="streak-milestone-collect"
              onClick={onClose}
              className="mt-1 h-12 w-full rounded-xl border-[3px] border-neo-black bg-neo-lime font-neo-display font-black uppercase text-neo-black shadow-hard-sm active:translate-y-0.5 active:shadow-none"
            >
              {t('dailyStreak.flame.collect')}
            </button>
          </>
        ) : (
          <>
            {phase === 'failed' && (
              <p data-testid="streak-milestone-failed" role="alert" className="text-sm font-bold text-neo-red">
                {t('dailyStreak.flame.claimFailed')}
              </p>
            )}
            <button
              type="button"
              data-testid="streak-milestone-claim"
              onClick={claim}
              disabled={phase === 'claiming'}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border-[3px] border-neo-black bg-neo-yellow font-neo-display text-lg font-black uppercase text-neo-black shadow-hard active:translate-y-0.5 active:shadow-none disabled:opacity-80"
            >
              <Gift className="h-5 w-5" aria-hidden="true" />
              {phase === 'claiming' ? t('dailyStreak.flame.claiming') : t('dailyStreak.flame.claim', { coins: milestone.coins })}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={phase === 'claiming'}
              className="min-h-11 px-4 text-xs font-bold text-neo-white/70 underline-offset-4 hover:underline"
            >
              {t('dailyStreak.flame.later')}
            </button>
          </>
        )}
      </m.div>
    </div>,
    document.body,
  );
}

export default StreakMilestoneReveal;
