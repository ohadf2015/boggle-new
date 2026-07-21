'use client';

import { memo } from 'react';
import { isEpicPart, isLegendaryPart, isPremiumPart } from '@/shared/types/customAvatar';
import type { VisualTier } from './AvatarTierEffects';
import { useLanguage } from '@/contexts/LanguageContext';

interface AvatarTierBadgeProps {
  category: string;
  partId: string;
  size?: 'sm' | 'md';
  className?: string;
}

function getPartVisualTier(category: string, partId: string): VisualTier {
  if (isLegendaryPart(category, partId)) return 'legendary';
  if (isEpicPart(category, partId)) return 'epic';
  if (isPremiumPart(category, partId)) return 'rare';
  return 'common';
}

const TIER_STYLES: Record<VisualTier, { bg: string; border: string; text: string; dot: string }> = {
  common: {
    bg: 'bg-[#8B5A2B]/15',
    border: 'border-[#8B5A2B]/40',
    text: 'text-[#C49A6C]',
    dot: 'bg-[#C49A6C]',
  },
  rare: {
    bg: 'bg-[#A0AEC0]/15',
    border: 'border-[#A0AEC0]/50',
    text: 'text-[#E2E8F0]',
    dot: 'bg-[#E2E8F0]',
  },
  epic: {
    bg: 'bg-[#FFD700]/15',
    border: 'border-[#FFD700]/50',
    text: 'text-[#FFE066]',
    dot: 'bg-[#FFE066]',
  },
  legendary: {
    bg: 'bg-gradient-to-br from-[#FFD700]/20 via-[#FF1493]/20 to-[#00FFFF]/20',
    border: 'border-[#FFD700]/60',
    text: 'text-[#FFD700]',
    dot: 'bg-[#FFD700]',
  },
};

/**
 * Small rarity badge for a single part — used in builder grids and shop lists.
 * Shows nothing for Common parts so free rows stay clean.
 * Labels always go through t() (avatarBuilder.tiers.*) — never hardcoded EN.
 */
const AvatarTierBadge = memo<AvatarTierBadgeProps>(({ category, partId, size = 'sm', className = '' }) => {
  const { t } = useLanguage();
  const tier = getPartVisualTier(category, partId);
  if (tier === 'common') return null;

  const styles = TIER_STYLES[tier];
  const boxClasses = size === 'sm'
    ? 'px-1.5 py-0.5 text-[9px] gap-1'
    : 'px-2 py-1 text-[10px] gap-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-neo font-black uppercase tracking-wider border ${styles.bg} ${styles.border} ${styles.text} ${boxClasses} ${className}`}
      data-tier={tier}
    >
      <span className={`w-1 h-1 rounded-full ${styles.dot} ${tier === 'legendary' ? 'animate-pulse' : ''}`} />
      {t(`avatarBuilder.tiers.${tier}`)}
    </span>
  );
});

AvatarTierBadge.displayName = 'AvatarTierBadge';

export { getPartVisualTier };
export type { AvatarTierBadgeProps };
export default AvatarTierBadge;
