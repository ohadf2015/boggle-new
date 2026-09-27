'use client';

import React from 'react';
import { Award } from 'lucide-react';
import { AchievementBadge } from '@/components/AchievementBadge';
import { isHallOfFameAchievement } from '@/utils/achievementTiers';
import { getAchievementIcon } from '@/constants/achievementIcons';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Read-only earned-badge row for a public profile.
 * Hall-of-Fame badges first, then by count. Renders nothing when the player
 * has earned no achievements (the public profile simply omits the section).
 */
export function ProfileAchievementsPublic({
  counts,
}: {
  counts: Record<string, number> | null | undefined;
}) {
  const { t } = useLanguage();

  const earned = Object.entries(counts || {})
    .filter(([, c]) => (c as number) > 0)
    .sort((a, b) => {
      const aHof = isHallOfFameAchievement(a[0]) ? 1 : 0;
      const bHof = isHallOfFameAchievement(b[0]) ? 1 : 0;
      if (aHof !== bHof) return bHof - aHof;
      return (b[1] as number) - (a[1] as number);
    });

  if (earned.length === 0) return null;

  return (
    <div className="relative bg-neo-navy-light overflow-hidden mb-4 border-3 border-neo-black rounded-neo shadow-hard-lime p-5">
      {/* Lime halftone ribbon — top edge (matches the profile section language) */}
      <div className="absolute top-0 inset-x-0 h-2.5 bg-neo-lime">
        <div className="absolute inset-0 texture-halftone-comic opacity-30 mix-blend-overlay" aria-hidden />
      </div>

      <h2 className="mt-3 mb-4 text-2xl font-black font-neo-display uppercase tracking-tight flex items-center gap-2.5 text-neo-white">
        <span className="w-10 h-10 flex items-center justify-center bg-neo-lime text-neo-black border-2 border-neo-black rounded-neo shadow-hard-sm">
          <Award strokeWidth={2.75} className="w-5 h-5" />
        </span>
        {t('profile.achievements')}
      </h2>
      <div className="flex flex-wrap gap-2">
        {earned.map(([key, count], index) => (
          <AchievementBadge
            key={key}
            achievement={{
              icon: getAchievementIcon(key),
              name: t(`achievements.${key}.name`) || key,
              description: t(`achievements.${key}.description`),
            }}
            index={index}
            count={count as number}
            showTier
            locked={false}
          />
        ))}
      </div>
    </div>
  );
}

export default ProfileAchievementsPublic;
