'use client';

import React, { memo } from 'react';
import { Hash, Target, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import PlayerArchetypeBadge from '@/components/results/PlayerArchetypeBadge';
import { AchievementBadge } from '@/components/AchievementBadge';
import type { PlayerArchetype } from '@/utils/playerArchetypes';
import type { GameAchievement } from '@/components/results/types';

/** Max achievement badges to show inline before overflow indicator */
const MAX_VISIBLE_ACHIEVEMENTS = 3;

interface MobileCompactStatsProps {
  /** Number of valid words found */
  wordCount: number;
  /** Accuracy percentage (0-100) */
  accuracy: number;
  /** Total words submitted (valid + invalid) for fraction display */
  totalWords?: number;
  /** Player archetype (optional) */
  archetype?: PlayerArchetype | null;
  /** Game achievements earned (optional) */
  achievements?: GameAchievement[];
  /** Additional className */
  className?: string;
}

/**
 * MobileCompactStats - Ultra-compact stats row for mobile results
 *
 * Shows words count, accuracy, archetype badge, and achievement badges.
 * Designed to fit above the fold with the banner and CTA.
 */
const MobileCompactStats: React.FC<MobileCompactStatsProps> = memo(({
  wordCount,
  accuracy,
  archetype,
  achievements,
  totalWords,
  className,
}) => {
  const { t } = useLanguage();

  const visibleAchievements = achievements?.slice(0, MAX_VISIBLE_ACHIEVEMENTS) ?? [];
  const overflowCount = (achievements?.length ?? 0) - MAX_VISIBLE_ACHIEVEMENTS;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Stats row: Words + Accuracy + Archetype */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {/* Words */}
        <div className="flex items-center gap-1.5 bg-white/10 rounded-neo border border-white/20 px-3 py-1.5">
          <div className="w-5 h-5 rounded bg-neo-lime text-neo-black flex items-center justify-center">
            <Hash className="w-3 h-3" />
          </div>
          <span className="text-lg font-black text-white">{wordCount}</span>
          <span className="text-[10px] text-white font-bold uppercase">
            {t('results.words')}
          </span>
        </div>

        {/* Accuracy */}
        <div className="flex items-center gap-1.5 bg-white/10 rounded-neo border border-white/20 px-3 py-1.5">
          <div className="w-5 h-5 rounded bg-neo-pink text-white flex items-center justify-center">
            <Target className="w-3 h-3" />
          </div>
          <span className="text-lg font-black text-white">
            {totalWords != null ? `${wordCount}/${totalWords}` : `${accuracy}%`}
          </span>
          <span className="text-[10px] text-white font-bold uppercase">
            {t('results.accuracy')}
          </span>
        </div>

        {/* Archetype Badge */}
        {archetype && (
          <PlayerArchetypeBadge archetype={archetype} size="xs" showTooltip={false} />
        )}
      </div>

      {/* Achievements row */}
      {visibleAchievements.length > 0 && (
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <Award className="w-3.5 h-3.5 text-neo-lime shrink-0" />
          {visibleAchievements.map((ach, i) => (
            <AchievementBadge key={ach.key || ach.name || `ach-${i}`} achievement={ach} index={i} />
          ))}
          {overflowCount > 0 && (
            <span className="text-xs font-bold text-white px-1.5 py-0.5 bg-white/10 rounded-neo border border-white/20">
              +{overflowCount}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

MobileCompactStats.displayName = 'MobileCompactStats';

export default MobileCompactStats;
