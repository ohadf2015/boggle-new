'use client';

import React from 'react';
import Image from 'next/image';
import { m, useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import type { SeasonRankBadge } from '@/lib/seasonBadges';

export interface SeasonBadgeCardProps {
  badge: SeasonRankBadge;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  onClick?: () => void;
}

const SIZE_PX: Record<NonNullable<SeasonBadgeCardProps['size']>, number> = {
  sm: 88,
  md: 128,
  lg: 200,
};

const RARITY_GLOW: Record<SeasonRankBadge['rarity'], string> = {
  legendary: 'drop-shadow-[0_0_20px_#FFD700]',
  epic: 'drop-shadow-[0_0_16px_#C0C0C0]',
  rare: 'drop-shadow-[0_0_12px_#CD7F32]',
  uncommon: 'drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]',
};

export const SeasonBadgeCard: React.FC<SeasonBadgeCardProps> = ({
  badge,
  size = 'md',
  showSubtitle = true,
  onClick,
}) => {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const px = SIZE_PX[size];
  const title = t(badge.titleKey);
  const subtitle = t('seasonBadges.subtitle', {
    theme: badge.theme,
    seasonId: badge.seasonId,
  });
  const rarityLabel = t(`seasonBadges.rarity.${badge.rarity}`);

  const Wrapper = onClick ? m.button : m.div;

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      whileHover={reduceMotion ? undefined : { y: -4, scale: 1.02 }}
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      className="
        flex flex-col items-center gap-2 outline-none
        focus-visible:ring-4 focus-visible:ring-neo-pink focus-visible:rounded-neo
      "
      aria-label={`${title} — ${subtitle}`}
      data-rank={badge.rank}
      data-season-id={badge.seasonId}
      data-testid={`season-badge-${badge.seasonId}-${badge.rank}`}
    >
      <div className={`relative ${RARITY_GLOW[badge.rarity]}`} style={{ width: px, height: px }}>
        <Image
          src={badge.imagePath}
          alt={title}
          fill
          sizes={`${px}px`}
          className="object-contain"
          priority={size === 'lg'}
        />
      </div>
      {showSubtitle && (
        <div className="text-center">
          <p className="font-neo-display text-sm text-neo-white uppercase tracking-wide">
            {title}
          </p>
          <p className="text-[10px] font-neo-body text-neo-white mt-0.5">
            {subtitle}
          </p>
          <p
            className="
              inline-block mt-1 px-1.5 py-0.5 text-[9px] font-neo-display uppercase
              border border-black rounded-sm
            "
            style={{ background: badge.accentColor, color: '#0F172A' }}
          >
            {rarityLabel}
          </p>
        </div>
      )}
    </Wrapper>
  );
};

export default SeasonBadgeCard;
