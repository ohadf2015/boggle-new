'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRankedTier } from '@/hooks/useRankedTier';
import { NeoPanel } from '@/components/ui/panel';
import { Trophy, ChevronUp } from 'lucide-react';

interface RankedTierBadgeProps {
  compact?: boolean;
  overrideElo?: number;
}

export default function RankedTierBadge({ compact, overrideElo }: RankedTierBadgeProps) {
  const { t } = useLanguage();
  const { tier, elo, progress, nextTier, season, daysRemaining } = useRankedTier(overrideElo);

  const tierNameKey = `ranked.${tier.id}` as const;

  if (compact) {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2 py-1 border-2 border-neo-black rounded-neo shadow-hard-sm font-bold text-sm"
        style={{ backgroundColor: tier.color + '22', borderColor: tier.color }}
      >
        <span className="text-base">{tier.icon}</span>
        <span style={{ color: tier.color }}>{t(tierNameKey)}</span>
        <span className="text-neo-black/60 text-xs">{elo}</span>
      </div>
    );
  }

  return (
    <NeoPanel tone="cream" className="p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-3xl">{tier.icon}</span>
          <div>
            <h3 className="font-black text-lg" style={{ color: tier.color }}>
              {t(tierNameKey)}
            </h3>
            <p className="text-sm text-neo-black/60 font-medium">{elo} ELO</p>
          </div>
        </div>
        <div className="text-end">
          <p className="text-xs font-bold text-neo-black/50">
            {t('ranked.season')} {season}
          </p>
          <p className="text-xs text-neo-black/40">
            {daysRemaining} {t('ranked.daysLeft')}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-3 border-2 border-neo-black rounded-full overflow-hidden bg-neo-cream">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.round(progress * 100)}%`,
              backgroundColor: tier.color,
            }}
          />
        </div>

        {/* Next tier info */}
        {nextTier ? (
          <div className="flex items-center justify-between text-xs font-medium text-neo-black/50">
            <span className="flex items-center gap-1">
              <ChevronUp className="w-3 h-3" />
              {t('ranked.nextTier')}: {t(`ranked.${nextTier.id}`)}
            </span>
            <span>{nextTier.minElo - elo} ELO</span>
          </div>
        ) : (
          <p className="text-xs font-bold text-center" style={{ color: tier.color }}>
            <Trophy className="w-3 h-3 inline-block me-1" />
            {t('ranked.maxTier')}
          </p>
        )}
      </div>
    </NeoPanel>
  );
}
