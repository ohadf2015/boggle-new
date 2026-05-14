'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Trophy, Star, Clock, BookOpenText } from 'lucide-react';
import { StatCard } from './StatCard';
import { formatTimePlayed } from '@/constants/achievementIcons';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ProfileData } from '@/contexts/auth/authTypes';

interface ProfileStatsGridProps {
  profile: ProfileData | null;
  isDarkMode: boolean;
  delay?: number;
}

export function ProfileStatsGrid({ profile, isDarkMode, delay = 0.1 }: ProfileStatsGridProps): React.ReactNode {
  const { t } = useLanguage();

  const totalScore = profile?.total_score || 0;
  const totalWins = (profile?.ranked_wins || 0) + (profile?.casual_wins || 0);
  const totalWords = profile?.total_words || 0;
  const totalTime = profile?.total_time_played || 0;

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 pt-2"
    >
      <StatCard
        icon={<Star strokeWidth={2.5} />}
        label={t('profile.totalScore')}
        value={totalScore.toLocaleString()}
        isDarkMode={isDarkMode}
        color="cyan"
        index={0}
      />
      <StatCard
        icon={<Trophy strokeWidth={2.5} />}
        label={t('profile.wins')}
        value={totalWins}
        isDarkMode={isDarkMode}
        color="pink"
        index={1}
      />
      <StatCard
        icon={<BookOpenText strokeWidth={2.5} />}
        label={t('profile.wordsFound')}
        value={totalWords.toLocaleString()}
        isDarkMode={isDarkMode}
        color="lime"
        index={2}
      />
      <StatCard
        icon={<Clock strokeWidth={2.5} />}
        label={t('profile.timePlayed')}
        value={formatTimePlayed(totalTime)}
        isDarkMode={isDarkMode}
        color="purple"
        index={3}
      />
    </m.div>
  );
}

export default ProfileStatsGrid;
