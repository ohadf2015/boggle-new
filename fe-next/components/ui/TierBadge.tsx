'use client';

import React, { memo } from 'react';
import Image from 'next/image';
import { GLOBAL_LEADERBOARD_TIERS, type LeaderboardTierDef, type LeaderboardTierId } from '@/lib/ranked/leaderboardTiers';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type TierBadgeSize = 'xs' | 'sm' | 'md' | 'lg';

interface TierBadgeProps {
  tier: LeaderboardTierDef;
  size?: TierBadgeSize;
  /** Show tier name label next to badge */
  showLabel?: boolean;
  /** Show animated glow ring */
  animated?: boolean;
  className?: string;
}

// ──────────────────────────────────────────────
// Size config
// ──────────────────────────────────────────────

const SIZE_CONFIG: Record<TierBadgeSize, { img: number; wrapper: string; font: string }> = {
  xs: { img: 16, wrapper: 'w-4 h-4', font: 'text-[9px]' },
  sm: { img: 22, wrapper: 'w-[22px] h-[22px]', font: 'text-[10px]' },
  md: { img: 32, wrapper: 'w-8 h-8', font: 'text-xs' },
  lg: { img: 48, wrapper: 'w-12 h-12', font: 'text-sm' },
};

// ──────────────────────────────────────────────
// TierBadge — image badge with optional label
// ──────────────────────────────────────────────

export const TierBadge = memo<TierBadgeProps>(
  ({ tier, size = 'sm', showLabel = false, animated = false, className = '' }) => {
    const { img, wrapper, font } = SIZE_CONFIG[size];

    return (
      <div
        className={`flex items-center gap-1 shrink-0 ${className}`}
        title={tier.name}
        data-testid={`tier-badge-${tier.id}`}
      >
        <div
          className={`relative ${wrapper} ${animated ? 'animate-pulse' : ''}`}
          style={
            animated
              ? { filter: `drop-shadow(0 0 6px ${tier.glowColor})` }
              : { filter: `drop-shadow(0 0 2px ${tier.glowColor})` }
          }
        >
          <Image
            src={tier.imagePath}
            alt={tier.name}
            width={img}
            height={img}
            className="object-contain w-full h-full"
            unoptimized
          />
        </div>

        {showLabel && (
          <span
            className={`font-bold ${font} leading-none`}
            style={{ color: tier.color }}
          >
            {tier.name}
          </span>
        )}
      </div>
    );
  }
);

TierBadge.displayName = 'TierBadge';

// ──────────────────────────────────────────────
// TierProgressBar — shows progress within tier
// ──────────────────────────────────────────────

interface TierProgressBarProps {
  tier: LeaderboardTierDef;
  progress: number; // 0-1
  nextThreshold: number | null;
  className?: string;
}

export const TierProgressBar = memo<TierProgressBarProps>(
  ({ tier, progress, nextThreshold, className = '' }) => {
    const isMaxTier = tier.maxScore === Infinity;
    const pct = Math.round(progress * 100);

    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span style={{ color: tier.color }} className="font-bold">
            {tier.name}
          </span>
          {!isMaxTier && nextThreshold != null && (
            <span>{pct}% to next tier</span>
          )}
          {isMaxTier && <span className="text-purple-400">Max tier!</span>}
        </div>
        <div className="h-1.5 rounded-full bg-neo-navy-elevated overflow-hidden">
          <div
            className={`h-full rounded-full bg-linear-to-r ${tier.gradient} transition-all duration-500`}
            style={{ width: `${isMaxTier ? 100 : pct}%` }}
          />
        </div>
      </div>
    );
  }
);

TierProgressBar.displayName = 'TierProgressBar';

// ──────────────────────────────────────────────
// TierPill — compact inline tier display
// ──────────────────────────────────────────────

interface TierPillProps {
  tierId: LeaderboardTierId;
  size?: 'xs' | 'sm';
  className?: string;
}

export const TierPill = memo<TierPillProps>(({ tierId, size = 'sm', className = '' }) => {
  const tier = GLOBAL_LEADERBOARD_TIERS.find((t) => t.id === tierId);
  if (!tier) return null;

  const isXs = size === 'xs';

  return (
    <div
      className={`
        inline-flex items-center gap-1 rounded-full border
        ${isXs ? 'px-1.5 py-0.5' : 'px-2 py-0.5'}
        ${className}
      `}
      style={{
        borderColor: `${tier.color}66`,
        backgroundColor: `${tier.color}18`,
      }}
      title={tier.name}
    >
      <Image
        src={tier.imagePath}
        alt={tier.name}
        width={isXs ? 12 : 16}
        height={isXs ? 12 : 16}
        className="object-contain"
        unoptimized
      />
      <span
        className={`font-bold leading-none ${isXs ? 'text-[9px]' : 'text-[11px]'}`}
        style={{ color: tier.color }}
      >
        {tier.name}
      </span>
    </div>
  );
});

TierPill.displayName = 'TierPill';
