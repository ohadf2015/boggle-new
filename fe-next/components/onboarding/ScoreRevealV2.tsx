'use client';

import React, { useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { ArrowRight, Coins, Flame } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { fireVictoryConfetti, fireFireworks } from '@/utils/confettiUtils';
import { Mascot } from '@/components/ui/Mascot';
import { getTitleTier, computeGoldReward } from '@/utils/onboardingTitles';

interface ScoreRevealV2Props {
  score: number;
  onContinue: () => void;
  onSkip?: () => void;
}

const TIER_BG: Record<'purple' | 'cyan' | 'lime' | 'pink' | 'yellow', string> = {
  purple: 'bg-neo-purple',
  cyan: 'bg-neo-cyan',
  lime: 'bg-neo-lime',
  pink: 'bg-neo-pink',
  yellow: 'bg-[#FFE135]',
};

const TIER_MASCOT: Record<'purple' | 'cyan' | 'lime' | 'pink' | 'yellow', 'celebration' | 'flexing' | 'mindblown' | 'onfire' | 'dance'> = {
  purple: 'celebration',
  cyan: 'mindblown',
  lime: 'celebration',
  pink: 'flexing',
  yellow: 'onfire',
};

const ScoreRevealV2: React.FC<ScoreRevealV2Props> = ({ score, onContinue, onSkip }) => {
  const { t, dir } = useLanguage();
  const tier = getTitleTier(score);
  const goldReward = computeGoldReward(score);

  const [displayGold, setDisplayGold] = useState(0);
  useEffect(() => {
    const target = goldReward;
    const durationMs = 1100;
    const startDelayMs = 700;
    let rafId: number | null = null;
    let startTime: number | null = null;
    const startTimer = setTimeout(() => {
      const tick = (now: number) => {
        if (startTime === null) startTime = now;
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / durationMs, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        setDisplayGold(Math.round(target * eased));
        if (progress < 1) rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    }, startDelayMs);
    return () => {
      clearTimeout(startTimer);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [goldReward]);

  useEffect(() => {
    fireVictoryConfetti();
    const cancelFireworks = fireFireworks(4, 1800);
    return () => cancelFireworks();
  }, []);

  return (
    <m.div
      data-testid="score-reveal-v2"
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className="w-full max-w-sm lg:max-w-md mx-auto relative px-4 pt-8"
      dir={dir}
    >
      {/* Tier title — the hero. Asymmetric placement with mascot peeking from below-right. */}
      <m.div
        initial={{ scale: 0.5, rotate: -8, opacity: 0 }}
        animate={{ scale: 1, rotate: -2.5, opacity: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 360, damping: 14 }}
        className="relative mb-8"
      >
        <div
          className={cn(
            'relative text-center',
            TIER_BG[tier.accent],
            'border-3 border-neo-black rounded-neo px-5 py-5',
            'shadow-hard-lg'
          )}
        >
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-neo-black/55 mb-1 font-neo-body">
            {t('onboarding.ftue.v2.rewardsEarned')}
          </div>
          <div className="font-neo-display text-[2.25rem] lg:text-[2.75rem] font-black text-neo-black uppercase leading-[0.95] tracking-tight">
            {t(`onboarding.ftue.v2.titles.${tier.key}`)}
          </div>
        </div>

        {/* Mascot peek — overlap bottom-right, breaks the rectangle */}
        <m.div
          initial={{ scale: 0, x: 20, y: 10, rotate: 25 }}
          animate={{ scale: 1, x: 0, y: 0, rotate: 8 }}
          transition={{ delay: 0.55, type: 'spring', stiffness: 320, damping: 16 }}
          className={cn(
            'absolute z-20 pointer-events-none',
            dir === 'rtl' ? '-bottom-7 -left-3' : '-bottom-7 -right-3'
          )}
        >
          <Mascot
            variant={TIER_MASCOT[tier.accent]}
            size="sm"
            clipShape="circle"
            clipBorder={tier.accent === 'yellow' ? 'lime' : tier.accent}
          />
        </m.div>

        {/* Speech bubble — anchored opposite corner so it doesn't fight mascot */}
        <m.div
          initial={{ opacity: 0, scale: 0.85, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.85, type: 'spring', stiffness: 380, damping: 18 }}
          className={cn(
            'absolute z-30 -bottom-3 max-w-[60%]',
            dir === 'rtl' ? '-right-1' : '-left-1',
            'bg-neo-cream border-3 border-neo-black rounded-neo px-3 py-1.5',
            'shadow-hard-sm'
          )}
        >
          <span className="text-[11px] font-black text-neo-black uppercase tracking-wide font-neo-body">
            {t(`onboarding.ftue.v2.mascotReactions.${tier.key}`)}
          </span>
        </m.div>
      </m.div>

      {/* Reward stack — asymmetric, gold dominant, streak overlapping */}
      <div className="relative mb-5 mt-4">
        {/* Gold reward — the big one */}
        <m.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.65, type: 'spring', stiffness: 320, damping: 22 }}
          className={cn(
            'relative z-10 flex items-center gap-3 p-4',
            'bg-[#FFE135] border-3 border-neo-black rounded-neo shadow-hard-lg'
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-neo bg-neo-black/10 border-2 border-neo-black">
            <Coins className="h-6 w-6 text-neo-black" strokeWidth={3} />
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-neo-black/55 font-neo-body">
              {t('onboarding.ftue.v2.goldEarned')}
            </div>
            <div className="font-neo-display text-[2rem] font-black text-neo-black tabular-nums leading-none">
              +{displayGold}
            </div>
          </div>
        </m.div>

        {/* Streak — offset, smaller, riding on top of gold's right edge */}
        <m.div
          initial={{ y: 16, opacity: 0, rotate: 4 }}
          animate={{ y: 0, opacity: 1, rotate: 1.5 }}
          transition={{ delay: 0.85, type: 'spring', stiffness: 320, damping: 20 }}
          className={cn(
            'relative z-20 -mt-3 flex items-center gap-2.5 px-3 py-2',
            'bg-[#FF6B35] border-3 border-neo-black rounded-neo shadow-hard',
            dir === 'rtl' ? 'mr-auto ml-2 max-w-[78%]' : 'ml-auto mr-2 max-w-[78%]'
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-neo bg-neo-black/15 border-2 border-neo-black">
            <Flame className="h-4 w-4 text-neo-black" strokeWidth={3} fill="currentColor" />
          </div>
          <div className="flex-1">
            <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-neo-black/55 leading-tight font-neo-body">
              {t('onboarding.ftue.v2.streak')}
            </div>
            <div className="font-neo-display text-base font-black text-neo-black uppercase leading-tight">
              {t('onboarding.ftue.v2.streakStarted')}
            </div>
          </div>
        </m.div>
      </div>

      {/* Tomorrow hook — quiet, forward-pointing */}
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.05, duration: 0.4 }}
        className="mb-5 text-center"
      >
        <div className="inline-block px-3 py-1.5 rounded-full border-2 border-dashed border-neo-cream/30">
          <span className="text-[11px] font-bold text-neo-white uppercase tracking-[0.15em] font-neo-body">
            {t('onboarding.ftue.v2.tomorrowBonus')}
          </span>
        </div>
      </m.div>

      {/* Primary CTA */}
      <m.button
        data-testid="continue-button-v2"
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: [0.94, 1.03, 1], opacity: 1 }}
        transition={{ delay: 1.15, duration: 0.5, ease: 'easeOut' }}
        onClick={onContinue}
        className={cn(
          'w-full py-3.5 bg-neo-lime border-3 border-neo-black rounded-neo',
          'font-neo-display font-black text-neo-black text-base uppercase tracking-wide',
          'shadow-hard hover:shadow-hard-lg active:shadow-hard-pressed',
          'transition-all active:translate-y-[2px]',
          'flex items-center justify-center gap-2'
        )}
      >
        {t('onboarding.ftue.v2.claimAndPlay')}
        <ArrowRight className="w-5 h-5" strokeWidth={3} />
      </m.button>

      {/* Footer row — score (tiny) + skip */}
      <div className="flex items-center justify-between mt-3 px-1">
        <div className="text-[10px] font-bold text-neo-white uppercase tracking-[0.2em] tabular-nums font-neo-body">
          {t('onboarding.ftue.v2.scoreFooter', { score: String(score) })}
        </div>
        {onSkip && (
          <button
            onClick={onSkip}
            className="text-[10px] font-bold text-neo-white hover:text-neo-white uppercase tracking-[0.2em] underline-offset-2 hover:underline transition-colors font-neo-body"
          >
            {t('onboarding.ftue.v2.skipForNow')}
          </button>
        )}
      </div>
    </m.div>
  );
};

export default ScoreRevealV2;
