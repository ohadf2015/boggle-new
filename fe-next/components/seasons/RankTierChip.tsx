'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { TIER_ORDER, tierTextClass, tierBorderClass, type TierId } from '@/lib/seasons/scoreTier';

const SIZE_CLASSES = {
  xs: 'text-[10px] px-1.5 py-0.5',
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
} as const;

function isTier(tier: string): tier is TierId {
  return (TIER_ORDER as readonly string[]).includes(tier);
}

export function RankTierChip({
  tier,
  size = 'sm',
  className,
}: {
  tier: string | null | undefined;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  const { t } = useLanguage();
  if (!tier || !isTier(tier)) return null;
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
      {t(`rank.tier.${tier}`)}
    </span>
  );
}
