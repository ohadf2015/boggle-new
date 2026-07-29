'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { RankTier } from '@/shared/utils/eloRating';

interface NearRankTeaserProps {
  nextTier: RankTier;
  eloNeeded: number;
}

/**
 * Subtle near-rank teaser text. Meant to be placed below EloRankBadge.
 * Shows "One more win to X!" when within 50 ELO, otherwise "N ELO to X!".
 */
export function NearRankTeaser({ nextTier, eloNeeded }: NearRankTeaserProps) {
  const { t } = useLanguage();

  const isOneMoreWin = eloNeeded <= 50;
  const text = isOneMoreWin
    ? t('multiplayer.oneMoreWin', { tier: nextTier.name })
    : t('multiplayer.nearRank', { elo: String(eloNeeded), tier: nextTier.name });

  return (
    <div
      data-testid="near-rank-teaser"
      className="text-sm font-neo-body animate-pulse"
      style={{ color: nextTier.color }}
    >
      {text}
    </div>
  );
}
