'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import type { MasteryTier } from '@/types/adventure';

export interface MasteryBadgeProps {
  tier: MasteryTier;
}

const TIER_CONFIG: Record<Exclude<MasteryTier, 0>, {
  nameKey: string;
  colorClass: string;
  pipColor: string;
  bgClass: string;
}> = {
  1: { nameKey: 'adventure.mastery.tier.bronze', colorClass: 'text-amber-600', pipColor: 'bg-amber-600', bgClass: 'bg-amber-900/30' },
  2: { nameKey: 'adventure.mastery.tier.silver', colorClass: 'text-gray-300', pipColor: 'bg-gray-300', bgClass: 'bg-neo-navy-elevated/30' },
  3: { nameKey: 'adventure.mastery.tier.gold', colorClass: 'text-yellow-400', pipColor: 'bg-yellow-400', bgClass: 'bg-yellow-900/30' },
  4: { nameKey: 'adventure.mastery.tier.platinum', colorClass: 'text-gray-100', pipColor: 'bg-gray-100', bgClass: 'bg-gray-600/30' },
  5: { nameKey: 'adventure.mastery.tier.diamond', colorClass: 'text-cyan-200', pipColor: 'bg-cyan-200', bgClass: 'bg-cyan-900/30' },
};

export function MasteryBadge({ tier }: MasteryBadgeProps): React.JSX.Element | null {
  const { t } = useLanguage();

  if (tier === 0) return null;

  const config = TIER_CONFIG[tier];
  const tierName = t(config.nameKey);

  return (
    <AdaptiveMotion.div
      role="img"
      aria-label={`${t('adventure.mastery.label')}: ${tierName}`}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5',
        'border-2 border-neo-black rounded-neo shadow-hard-sm',
        config.bgClass,
        config.colorClass,
      )}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <span className="text-[10px] font-black uppercase tracking-wide">
        {tierName}
      </span>
      <span className="flex gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={`pip-${i}`}
            data-pip={i < tier ? 'filled' : 'empty'}
            className={cn(
              'w-1.5 h-1.5 rotate-45',
              'border border-neo-black',
              i < tier ? config.pipColor : 'bg-neo-black/30',
            )}
          />
        ))}
      </span>
    </AdaptiveMotion.div>
  );
}
