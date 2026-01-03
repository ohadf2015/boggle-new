'use client';

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import PlayerArchetypeBadge from './PlayerArchetypeBadge';
import type { PlayerArchetype } from '@/utils/playerArchetypes';

interface CompactResultsStatsProps {
  /** Number of valid words found */
  wordCount: number;
  /** Accuracy percentage (0-100) */
  accuracy: number;
  /** Optional player archetype to display */
  archetype?: PlayerArchetype | null;
  /** Additional className for the container */
  className?: string;
}

/**
 * CompactResultsStats - Shared stats row for results pages
 *
 * Used in both SinglePlayerResults and ResultsPage (multiplayer)
 * Shows: Words | Accuracy | Archetype badge
 *
 * Designed to sit below ResultsWinnerBanner, which shows rank and score.
 */
const CompactResultsStats: React.FC<CompactResultsStatsProps> = memo(({
  wordCount,
  accuracy,
  archetype,
  className,
}) => {
  const { t } = useLanguage();

  return (
    <div className={cn(
      'bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 border-3 border-neo-black rounded-neo p-3 shadow-hard',
      className
    )}>
      <div className="flex items-center justify-between gap-3">
        {/* Stats Grid */}
        <div className="flex items-center gap-4">
          {/* Words */}
          <div className="text-center">
            <div className="text-xl font-black text-white">
              {wordCount}
            </div>
            <div className="text-[10px] text-white/60 font-bold uppercase">
              {t('results.words') || 'Words'}
            </div>
          </div>
          {/* Accuracy */}
          <div className="text-center">
            <div className="text-xl font-black text-white">
              {accuracy}%
            </div>
            <div className="text-[10px] text-white/60 font-bold uppercase">
              {t('results.accuracy') || 'Accuracy'}
            </div>
          </div>
        </div>
        {/* Archetype Badge */}
        {archetype && (
          <PlayerArchetypeBadge archetype={archetype} size="sm" showTooltip={true} />
        )}
      </div>
    </div>
  );
});

CompactResultsStats.displayName = 'CompactResultsStats';

export default CompactResultsStats;
