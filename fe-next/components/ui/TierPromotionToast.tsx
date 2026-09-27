'use client';

import React, { memo } from 'react';
import Image from 'next/image';
import type { LeaderboardTierDef } from '@/lib/ranked/leaderboardTiers';

interface TierPromotionToastProps {
  tier: LeaderboardTierDef;
  t: (key: string, vars?: Record<string, string>) => string;
}

/**
 * Toast content shown when a player gets promoted to a new tier.
 * Used with sonner's toast.custom().
 */
export const TierPromotionToast = memo<TierPromotionToastProps>(({ tier, t }) => (
  <div
    className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 shadow-hard bg-neo-navy min-w-[240px]"
    style={{ borderColor: tier.color, boxShadow: `0 0 20px ${tier.glowColor}` }}
    data-testid="tier-promotion-toast"
  >
    <div
      className="shrink-0 w-12 h-12 animate-neo-pop"
      style={{ filter: `drop-shadow(0 0 10px ${tier.glowColor})` }}
    >
      <Image
        src={tier.imagePath}
        alt={tier.name}
        width={48}
        height={48}
        className="object-contain w-full h-full"
        unoptimized
      />
    </div>
    <div className="flex flex-col gap-0.5">
      <span className="text-neo-white font-black text-sm leading-tight">
        {t('leaderboard.tierUp.title')}
      </span>
      <span className="font-bold text-base leading-tight" style={{ color: tier.color }}>
        {tier.name}
      </span>
      <span className="text-slate-400 text-[11px] leading-tight">
        {t('leaderboard.tierUp.message', { tier: tier.name })}
      </span>
    </div>
  </div>
));

TierPromotionToast.displayName = 'TierPromotionToast';
