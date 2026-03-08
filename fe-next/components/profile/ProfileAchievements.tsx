'use client';

import React from 'react';
import { motion } from 'framer-motion';
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
      {/* Hall of Fame Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className={cn(
          'rounded-2xl p-4 mb-4',
          isDarkMode
            ? 'bg-gradient-to-br from-amber-900/20 via-slate-800/50 to-yellow-900/20 border border-amber-500/30'
            : 'bg-gradient-to-br from-amber-50 via-white to-yellow-50 border border-amber-200 shadow-lg'
        )}
      >
        <h2 className={cn(
          'text-base font-bold mb-2 flex items-center gap-2',
          isDarkMode ? 'text-amber-400' : 'text-amber-700'
        )}>
          <span className="text-lg">🏆</span>
          {t('profile.hallOfFame')}
        </h2>
        <p className={cn(
          'text-xs mb-3',
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        )}>
          {t('profile.hallOfFameDescription')}
        </p>
        <div className="flex flex-wrap gap-2">
          {hallOfFameAchievements.map((achievement, index) => renderAchievementBadge(achievement, index))}
        </div>
      </motion.div>

      {/* Regular Achievements Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay + 0.05 }}
        className={cn(
          'rounded-2xl p-4',
          isDarkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200 shadow-lg'
        )}
      >
        <h2 className={cn(
          'text-base font-bold mb-3',
          isDarkMode ? 'text-white' : 'text-gray-900'
        )}>
          {t('profile.achievements')}
        </h2>
        <div className="flex flex-wrap gap-2">
          {regularAchievements.map((achievement, index) => renderAchievementBadge(achievement, index))}
        </div>
      </motion.div>
    </>
  );
}

export default ProfileAchievements;
