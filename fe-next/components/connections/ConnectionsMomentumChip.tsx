'use client';

import { m } from 'framer-motion';
import { Flame, Gift, Sparkles, Target } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { MomentumState } from '@/lib/connections/momentum';

interface ConnectionsMomentumChipProps {
  state: MomentumState;
}

/** Tier → bar fill + glow. Hotter streaks read warmer (lime → cyan → orange). */
const TIER_BAR = ['bg-neo-lime', 'bg-neo-lime', 'bg-neo-cyan', 'bg-neo-orange'];

/**
 * Forward-pull HUD chip — always dangles the next reward a few solves away and
 * hypes hot streaks, so finishing one puzzle makes you want the next. Pure
 * presentation over the momentum state (see lib/connections/momentum.ts).
 */
export default function ConnectionsMomentumChip({ state }: ConnectionsMomentumChipProps) {
  const { t } = useLanguage();
  const { message, progressFraction, streakTier } = state;
  const pct = Math.round(progressFraction * 100);

  let label: string;
  let Icon = Target;
  switch (message.kind) {
    case 'rewardEarned':
      label = t('connections.momentum.rewardEarned');
      Icon = Gift;
      break;
    case 'onFire':
      label = t('connections.momentum.onFire', { streak: message.streak });
      Icon = Flame;
      break;
    case 'start':
      label = t('connections.momentum.start', { goal: message.goal });
      Icon = Sparkles;
      break;
    default:
      label = t('connections.momentum.toReward', { count: message.remaining });
      Icon = Target;
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-neo border-neo border-neo-white/15 bg-neo-navy-light px-3 py-2 shadow-hard-sm">
      <div className="flex items-center gap-2">
        <m.span
          key={message.kind + (message.kind === 'rewardEarned' ? message.rewardNumber : '')}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 360, damping: 18 }}
          className={[
            'inline-flex items-center justify-center rounded-full p-1',
            streakTier >= 3 ? 'text-neo-orange' : streakTier >= 2 ? 'text-neo-cyan' : 'text-neo-lime',
          ].join(' ')}
        >
          <Icon className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
        </m.span>
        <span className="font-neo-body text-sm font-bold text-neo-white">{label}</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={label}
        className="h-1.5 w-full overflow-hidden rounded-full bg-neo-navy"
      >
        <m.div
          className={`h-full rounded-full ${TIER_BAR[streakTier]}`}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 220, damping: 28 }}
        />
      </div>
    </div>
  );
}
