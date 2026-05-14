'use client';

import React from 'react';
import { m } from 'framer-motion';
import { AchievementBadge } from '@/components/AchievementBadge';
import { isHallOfFameAchievement } from '@/utils/achievementTiers';
import { ACHIEVEMENT_ICONS, getAchievementIcon } from '@/constants/achievementIcons';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { ProfileData } from '@/contexts/auth/authTypes';

interface Achievement {
  icon: string;
  name: string;
  description: string;
}

interface ProfileAchievementsProps {
  profile: ProfileData | null;
  isDarkMode: boolean;
  delay?: number;
}

export function ProfileAchievements({
  profile,
  isDarkMode,
  delay = 0.3
}: ProfileAchievementsProps): React.ReactNode {
  const { t } = useLanguage();

  const earnedCounts = profile?.achievement_counts || {};
  const allAchievementKeys = Object.keys(ACHIEVEMENT_ICONS);

  const earnedAchievements = Object.entries(earnedCounts)
    .sort((a, b) => (b[1] as number) - (a[1] as number));

  const lockedAchievements = allAchievementKeys
    .filter(key => !earnedCounts[key])
    .sort();

  const allAchievements = [
    ...earnedAchievements.map(([key, count]) => ({ key, count: count as number, locked: false })),
    ...lockedAchievements.map(key => ({ key, count: 0, locked: true }))
  ];

  const hallOfFameAchievements = allAchievements.filter(a => isHallOfFameAchievement(a.key));
  const regularAchievements = allAchievements.filter(a => !isHallOfFameAchievement(a.key));

  const totalEarned = earnedAchievements.length;
  const totalAchievements = allAchievementKeys.length;

  const renderAchievementBadge = ({ key, count, locked }: { key: string; count: number; locked: boolean }, index: number) => {
    const achievementData: Achievement = {
      icon: getAchievementIcon(key),
      name: t(`achievements.${key}.name`) || key,
      description: t(`achievements.${key}.description`),
    };
    return (
      <AchievementBadge
        key={key}
        achievement={achievementData}
        index={index}
        count={count}
        showTier={true}
        locked={locked}
      />
    );
  };

  return (
    <>
      {/* Section header */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="flex items-end justify-between mb-3"
      >
        <h2 className="text-2xl font-black font-neo-display uppercase tracking-tight text-white">
          {t('profile.achievements')}
        </h2>
        <span className="text-xs font-black uppercase text-neo-lime bg-neo-lime/10 px-3 py-1.5 rounded-full">
          {totalEarned} / {totalAchievements}
        </span>
      </m.div>

      {/* Hall of Fame Section */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="rounded-neo p-6 mb-4 bg-neo-navy-light border-neo border-neo-lime shadow-hard"
      >
        <div className="pb-3 border-b border-neo-lime/10 mb-4">
          <h3 className="text-sm font-black uppercase text-neo-lime tracking-widest flex items-center gap-2">
            <span>🏆</span>
            {t('profile.hallOfFame')}
          </h3>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          {t('profile.hallOfFameDescription')}
        </p>
        <div className="flex flex-wrap gap-2">
          {hallOfFameAchievements.map((achievement, index) => renderAchievementBadge(achievement, index))}
        </div>
      </m.div>

      {/* Regular Achievements Section */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay + 0.05 }}
        className="rounded-neo p-6 bg-neo-navy-light border-neo border-neo-white/20 shadow-hard"
      >
        <div className="flex flex-wrap gap-2">
          {regularAchievements.map((achievement, index) => renderAchievementBadge(achievement, index))}
        </div>
      </m.div>
    </>
  );
}

export default ProfileAchievements;
