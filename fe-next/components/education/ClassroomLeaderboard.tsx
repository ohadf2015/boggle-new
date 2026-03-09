'use client';

/**
 * ClassroomLeaderboard - Enhanced Leaderboard with Time Scopes
 *
 * Features:
 * - Weekly/Monthly/All-Time tabs
 * - Rank delta indicators (up/down/NEW/no-change)
 * - Streak badges (fire icon for >= 3 days)
 * - Tier badges (Top 10%, 25%, 50%)
 * - Full student list (scrollable)
 * - Neo-brutalist styling
 * - RTL support
 */

import { memo } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Users, ArrowUp, ArrowDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassroomLeaderboard } from '@/hooks/useClassroomLeaderboard';
import { getLeaderboardTier } from '@/lib/supabase/education/leaderboard';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';
import type { LeaderboardEntryWithDelta, LeaderboardTimeScope } from '@/lib/supabase/education/types';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface ClassroomLeaderboardProps {
  /** Classroom ID to fetch leaderboard for */
  classroomId: string;
  /** Current student's user ID (for highlighting) */
  currentUserId: string;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// TIME SCOPE TABS
// ============================================

interface TimeScopeTabsProps {
  timeScope: LeaderboardTimeScope;
  onScopeChange: (scope: LeaderboardTimeScope) => void;
}

const TimeScopeTabs = memo<TimeScopeTabsProps>(({ timeScope, onScopeChange }) => {
  const { t } = useLanguage();

  const tabs: Array<{ key: LeaderboardTimeScope; label: string }> = [
    { key: 'weekly', label: t('education.leaderboard.weekly') },
    { key: 'monthly', label: t('education.leaderboard.monthly') },
    { key: 'all-time', label: t('education.leaderboard.allTime') },
  ];

  return (
    <div className="flex gap-2 mb-4">
      {tabs.map(tab => (
        <button
          key={tab.key}
          role="button"
          onClick={() => onScopeChange(tab.key)}
          className={cn(
            'px-4 py-2 rounded-neo border-neo font-neo-body font-bold text-sm transition-all',
            timeScope === tab.key
              ? 'bg-neo-yellow text-neo-black border-neo-black shadow-hard-sm'
              : 'bg-neo-navy text-neo-white/60 border-neo-black/30 hover:text-neo-white/80'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
});

TimeScopeTabs.displayName = 'TimeScopeTabs';

// ============================================
// RANK DELTA INDICATOR
// ============================================

interface RankDeltaProps {
  rankDelta: number | null;
  isNew: boolean;
}

const RankDeltaIndicator = memo<RankDeltaProps>(({ rankDelta, isNew }) => {
  const { t } = useLanguage();

  if (isNew) {
    return (
      <span
        data-testid="rank-delta-new"
        className="px-2 py-0.5 text-xs font-neo-body font-bold bg-neo-cyan text-neo-black rounded"
      >
        {t('education.leaderboard.newEntry')}
      </span>
    );
  }

  if (rankDelta === null || rankDelta === 0) {
    return (
      <span data-testid="rank-delta-none" className="text-neo-white/40 text-sm">
        −
      </span>
    );
  }

  if (rankDelta > 0) {
    // Moved up
    return (
      <span
        data-testid="rank-delta-up"
        className="flex items-center gap-1 text-green-400 text-sm font-neo-body font-bold"
      >
        <ArrowUp className="w-4 h-4" />
        +{rankDelta}
      </span>
    );
  }

  // Moved down
  return (
    <span
      data-testid="rank-delta-down"
      className="flex items-center gap-1 text-neo-orange text-sm font-neo-body font-bold"
    >
      <ArrowDown className="w-4 h-4" />
      {rankDelta}
    </span>
  );
});

RankDeltaIndicator.displayName = 'RankDeltaIndicator';

// ============================================
// TIER BADGE
// ============================================

interface TierBadgeProps {
  rank: number;
  totalStudents: number;
}

const TierBadge = memo<TierBadgeProps>(({ rank, totalStudents }) => {
  const { t } = useLanguage();
  const tier = getLeaderboardTier(rank, totalStudents);

  if (!tier) return null;

  const tierConfig = {
    top10: { bg: 'bg-neo-yellow', label: t('education.leaderboard.top10') },
    top25: { bg: 'bg-neo-white/60', label: t('education.leaderboard.top25') },
    top50: { bg: 'bg-neo-orange', label: t('education.leaderboard.top50') },
  };

  const config = tierConfig[tier];

  return (
    <span
      data-testid={`tier-badge-${tier}`}
      className={cn(
        'px-2 py-0.5 text-xs font-neo-body font-bold text-white rounded',
        config.bg
      )}
    >
      {config.label}
    </span>
  );
});

TierBadge.displayName = 'TierBadge';

// ============================================
// LEADERBOARD ENTRY
// ============================================

interface LeaderboardEntryRowProps extends LeaderboardEntryWithDelta {
  totalStudents: number;
  index: number;
}

const LeaderboardEntryRow = memo<LeaderboardEntryRowProps>(
  ({ userId, displayName, avatarUrl, totalXp, currentLevel, rank, isCurrentUser, isInactive, currentStreak, previousRank: _previousRank, rankDelta, isNew, totalStudents, index }) => {
    const { t } = useLanguage();

    return (
      <motion.div
        data-testid={isCurrentUser ? 'leaderboard-entry-current-user' : `leaderboard-entry-${userId}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: isInactive ? 0.5 : 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        className={cn(
          'relative p-4 rounded-neo border-neo shadow-hard-sm',
          'flex items-center gap-4',
          isCurrentUser
            ? 'bg-neo-cyan/20 border-neo-cyan'
            : 'bg-neo-navy border-neo-black',
          isInactive && 'opacity-50'
        )}
      >
        {/* Rank Number */}
        <div className="flex-shrink-0 w-8 h-8 rounded-neo border-neo bg-neo-navy border-neo-black flex items-center justify-center">
          <span className="font-neo-display font-black text-sm text-neo-white">
            {rank}
          </span>
        </div>

        {/* Avatar */}
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={`${displayName}'s avatar`}
            width={48}
            height={48}
            className="w-12 h-12 rounded-full border-neo border-neo-black"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-neo-navy border-neo border-neo-black flex items-center justify-center">
            <span className="text-2xl">👤</span>
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-neo-display font-bold text-neo-white truncate">
              {displayName}
            </p>
            {isInactive && (
              <span className="px-2 py-0.5 text-xs font-neo-body bg-neo-black/50 text-neo-white/70 rounded">
                {t('education.leaderboard.inactive')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* XP */}
            <span className="font-neo-body font-bold text-neo-yellow text-sm">
              {t('education.leaderboard.xp', { xp: totalXp })}
            </span>

            {/* Level */}
            <span className="px-2 py-0.5 text-xs font-neo-body bg-neo-cyan text-neo-black rounded">
              {t('education.leaderboard.level', { level: currentLevel })}
            </span>

            {/* Streak Badge */}
            {currentStreak >= 3 && (
              <span
                data-testid="streak-badge"
                className="px-2 py-0.5 text-xs font-neo-body bg-neo-orange text-white rounded flex items-center gap-1"
              >
                🔥 {currentStreak}
              </span>
            )}

            {/* Tier Badge */}
            <TierBadge rank={rank} totalStudents={totalStudents} />
          </div>
        </div>

        {/* Rank Delta */}
        <div className="flex-shrink-0">
          <RankDeltaIndicator rankDelta={rankDelta} isNew={isNew} />
        </div>
      </motion.div>
    );
  }
);

LeaderboardEntryRow.displayName = 'LeaderboardEntryRow';

// ============================================
// MAIN COMPONENT
// ============================================

const ClassroomLeaderboard = memo<ClassroomLeaderboardProps>(
  ({ classroomId, currentUserId, className }) => {
    const { t, dir } = useLanguage();
    const isRTL = dir === 'rtl';

    const { fullList, totalStudents, isLoading, error, timeScope, setTimeScope } =
      useClassroomLeaderboard({
        classroomId,
        currentUserId,
        initialTimeScope: 'weekly',
      });

    // Loading state
    if (isLoading) {
      return (
        <div data-testid="leaderboard-skeleton" className={cn('w-full flex justify-center py-8', className)}>
          <Loader size="md" />
        </div>
      );
    }

    // Error state (silent fail)
    if (error) {
      return null;
    }

    // Empty state
    if (totalStudents === 0) {
      return (
        <div
          data-testid="classroom-leaderboard"
          dir={isRTL ? 'rtl' : 'ltr'}
          className={cn(
            'w-full rounded-neo border-neo border-neo-black shadow-hard bg-neo-navy',
            className
          )}
        >
          <EmptyState
            type="waiting-players"
            title={t('education.leaderboard.noStudentsYet')}
            icon={<Users className="w-full h-full" />}
            showMascot={false}
            size="sm"
          />
        </div>
      );
    }

    return (
      <div
        data-testid="classroom-leaderboard"
        dir={isRTL ? 'rtl' : 'ltr'}
        aria-label="Classroom leaderboard showing top students"
        className={cn('w-full space-y-4', className)}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏆</span>
          <h2 className="font-neo-display font-black text-2xl text-neo-white">
            {t('education.leaderboard.title')}
          </h2>
        </div>

        {/* Time Scope Tabs */}
        <TimeScopeTabs timeScope={timeScope} onScopeChange={setTimeScope} />

        {/* Full Student List */}
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {fullList.map((entry, index) => (
            <LeaderboardEntryRow
              key={entry.userId}
              {...entry}
              totalStudents={totalStudents}
              index={index}
            />
          ))}
        </div>

        {/* Footer: Total students */}
        <div className="text-center pt-2">
          <p className="font-neo-body text-sm text-neo-white/60">
            {t('education.leaderboard.studentsInClass', { count: totalStudents })}
          </p>
        </div>
      </div>
    );
  }
);

ClassroomLeaderboard.displayName = 'ClassroomLeaderboard';

export default ClassroomLeaderboard;
