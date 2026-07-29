'use client';

/**
 * RankedTierBadge - Compact badge showing ranked tier with progress bar.
 * Shows tier icon, name, rating, progress to next tier.
 * Compact layout for Header, profile, landing page.
 */

import React, { memo } from 'react';
import { Shield } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRankedTier } from '@/hooks/useRankedTier';
import { cn } from '@/lib/utils';

export const RankedTierBadge: React.FC = memo(function RankedTierBadge() {
  const { t } = useLanguage();
  const { tier, elo, progress } = useRankedTier();

  if (elo === 0) return null;

  return (
    <div
      data-testid="ranked-tier-badge"
      role="region"
      aria-label={t('rankedTier.title')}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-2 rounded-neo',
        'bg-neo-navy border-neo shadow-hard-sm',
        'min-w-0',
      )}
    >
      {/* Tier icon */}
      <div
        data-testid="tier-icon"
        className={cn(
          'shrink-0 w-8 h-8 rounded-full',
          'border-2 flex items-center justify-center',
        )}
        style={{ borderColor: tier.color, backgroundColor: `${tier.color}20` }}
        aria-hidden="true"
      >
        <Shield className="w-4 h-4" style={{ color: tier.color }} />
      </div>

      {/* Info column */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-bold font-neo-display"
            style={{ color: tier.color }}
          >
            {tier.name}
          </span>
          <span className="text-xs text-neo-white font-bold">
            {elo}
          </span>
        </div>

        {/* Progress bar */}
        <div
          className="w-full h-1.5 rounded-full bg-neo-white/10 overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('rankedTier.progress', { percent: String(Math.round(progress * 100)) })}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress * 100}%`,
              backgroundColor: tier.color,
            }}
          />
        </div>
      </div>
    </div>
  );
});

export default RankedTierBadge;
