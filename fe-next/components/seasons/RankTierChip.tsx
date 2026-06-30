'use client';

import React from 'react';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { TIER_ORDER, tierTextClass, tierBorderClass, tierVisual, type TierId } from '@/lib/seasons/scoreTier';

const SIZE_CLASSES = {
  xs: 'text-[10px] px-1.5 py-0.5',
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
} as const;

const IMG_SIZE = { xs: 14, sm: 16, md: 20 } as const;

function isTier(tier: string): tier is TierId {
  return (TIER_ORDER as readonly string[]).includes(tier);
}

export function RankTierChip({
  tier,
  size = 'sm',
  className,
  showImage = false,
}: {
  tier: string | null | undefined;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
  /** Show the tier's badge image before the label (sourced from leaderboard defs). */
  showImage?: boolean;
}) {
  const { t } = useLanguage();
  if (!tier || !isTier(tier)) return null;
  const visual = showImage ? tierVisual(tier) : null;
  const px = IMG_SIZE[size];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-neo border-2 bg-neo-navy font-neo-display uppercase tracking-wide',
        tierTextClass(tier),
        tierBorderClass(tier),
        SIZE_CLASSES[size],
        className,
      )}
    >
      {visual && (
        <Image
          src={visual.imagePath}
          alt=""
          aria-hidden="true"
          width={px}
          height={px}
          unoptimized
          className="object-contain -ms-0.5 shrink-0"
          style={{ filter: `drop-shadow(0 0 3px ${visual.glowColor})` }}
        />
      )}
      {t(`rank.tier.${tier}`)}
    </span>
  );
}
