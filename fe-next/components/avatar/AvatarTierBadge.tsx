'use client';

import { memo } from 'react';
import { getPartRarity, RARITY_TOKENS } from '@/lib/avatar/rarity';
import { useLanguage } from '@/contexts/LanguageContext';

interface AvatarTierBadgeProps {
  category: string;
  partId: string;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Small rarity badge for a single part — used in builder grids and shop lists.
 * Shows nothing for Common parts so free rows stay clean.
 * Labels always go through t() (avatarBuilder.tiers.*) — never hardcoded EN.
 */
const AvatarTierBadge = memo<AvatarTierBadgeProps>(({ category, partId, size = 'sm', className = '' }) => {
  const { t } = useLanguage();
  const tier = getPartRarity(category, partId);
  if (tier === 'common') return null;

  const styles = RARITY_TOKENS[tier];
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

export { getPartRarity as getPartVisualTier };
export type { AvatarTierBadgeProps };
export default AvatarTierBadge;
