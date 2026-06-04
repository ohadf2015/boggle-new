'use client';

import React from 'react';
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
    <div className="rounded-neo-xl p-5 bg-neo-navy-light border-2 border-black shadow-hard-lg">
      <h2 className="font-neo-display text-sm uppercase tracking-wide text-neo-white mb-3">
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
