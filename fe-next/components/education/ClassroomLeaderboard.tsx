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
 * - Staggered entrance + current-user highlight animation
 */

import { memo, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Users, ArrowUp, ArrowDown, Flame, User, Trophy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassroomLeaderboard } from '@/hooks/useClassroomLeaderboard';
import { getLeaderboardTier } from '@/lib/supabase/education/leaderboard';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';
import type { LeaderboardEntryWithDelta, LeaderboardTimeScope } from '@/lib/supabase/education/types';

// ============================================
// ANIMATED XP COUNTER
// ============================================

function useAnimatedValue(target: number, duration = 350): number {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = target;
    if (from === target) return;

    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplay(Math.round(from + (target - from) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}

// ============================================
// TYPE DEFINITIONS
// ============================================

export type LeaderboardVisibility = 'full' | 'top3' | 'personal_only' | 'hidden';

export interface ClassroomLeaderboardProps {
  /** Classroom ID to fetch leaderboard for */
  classroomId: string;
  /** Current student's user ID (for highlighting) */
  currentUserId: string;
  /** Current student's ID used to determine "me" for filtered views */
  currentStudentId?: string;
  /** Privacy visibility mode */
  visibility?: LeaderboardVisibility;
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
          onClick={() => onScopeChange(tab.key)}
          className={cn(
            'px-4 py-2 rounded-neo border-neo font-neo-body font-bold text-sm transition-all',
            timeScope === tab.key
              ? 'bg-neo-lime text-neo-black border-neo-black shadow-hard-sm'
              : 'bg-neo-navy-light text-neo-white border-neo-black hover:bg-neo-navy'
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
      <AdaptiveMotion.span
        data-testid="rank-delta-new"
        className="px-2 py-0.5 text-xs font-neo-body font-bold bg-neo-cyan text-neo-black rounded"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 18 }}
      >
        {t('education.leaderboard.newEntry')}
      </AdaptiveMotion.span>
    );
  }

  if (rankDelta === null || rankDelta === 0) {
    return (
      <span data-testid="rank-delta-none" className="text-neo-white text-sm">
        −
      </span>
    );
  }

  if (rankDelta > 0) {
    // Moved up
    return (
      <AdaptiveMotion.span
        data-testid="rank-delta-up"
        className="flex items-center gap-1 text-green-400 text-sm font-neo-body font-bold"
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      >
        <ArrowUp className="w-4 h-4" />
        +{rankDelta}
      </AdaptiveMotion.span>
    );
  }

  // Moved down
  return (
    <AdaptiveMotion.span
      data-testid="rank-delta-down"
      className="flex items-center gap-1 text-neo-pink text-sm font-neo-body font-bold"
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 18 }}
    >
      <ArrowDown className="w-4 h-4" />
      {rankDelta}
    </AdaptiveMotion.span>
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
    top10: { bg: 'bg-neo-lime', text: 'text-neo-black', label: t('education.leaderboard.top10') },
    top25: { bg: 'bg-neo-cyan', text: 'text-neo-black', label: t('education.leaderboard.top25') },
    top50: { bg: 'bg-neo-pink', text: 'text-white', label: t('education.leaderboard.top50') },
  };

  const config = tierConfig[tier];

  return (
    <span
      data-testid={`tier-badge-${tier}`}
      className={cn(
        'px-2 py-0.5 text-xs font-neo-body font-bold rounded',
        config.bg,
        config.text
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
    const animatedXp = useAnimatedValue(totalXp);

    return (
      <AdaptiveMotion.div
        data-testid={isCurrentUser ? 'leaderboard-entry-current-user' : `leaderboard-entry-${userId}`}
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{
          opacity: isInactive ? 0.5 : 1,
          y: 0,
          scale: 1,
        }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 22,
          delay: index * 0.04,
        }}
        className={cn(
          'relative p-4 rounded-neo border-neo shadow-hard-sm',
          'flex items-center gap-4',
          isCurrentUser
            ? 'bg-neo-cyan/20 border-neo-cyan'
            : 'bg-neo-navy border-neo-black',
          isInactive && 'opacity-50'
        )}
      >
        {/* Highlight pulse for current user */}
        {isCurrentUser && (
          <div className="absolute inset-0 rounded-neo border-2 border-neo-cyan/40 animate-pulse pointer-events-none" />
        )}

        {/* Rank Number */}
        <div className="shrink-0 w-8 h-8 rounded-neo border-neo bg-neo-navy border-neo-black flex items-center justify-center">
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
            <User className="w-4 h-4" />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-neo-display font-bold text-neo-white truncate">
              {displayName}
            </p>
            {isInactive && (
              <span className="px-2 py-0.5 text-xs font-neo-body bg-neo-black/50 text-neo-white rounded">
                {t('education.leaderboard.inactive')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* XP */}
            <span className="font-neo-body font-bold text-neo-lime text-sm tabular-nums">
              {t('education.leaderboard.xp', { xp: animatedXp })}
            </span>

            {/* Level */}
            <span className="px-2 py-0.5 text-xs font-neo-body bg-neo-cyan text-neo-black rounded">
              {t('education.leaderboard.level', { level: currentLevel })}
            </span>

            {/* Streak Badge */}
            {currentStreak >= 3 && (
              <span
                data-testid="streak-badge"
                className="px-2 py-0.5 text-xs font-neo-body bg-neo-pink text-white rounded flex items-center gap-1"
              >
                <Flame className="w-4 h-4 inline" /> {currentStreak}
              </span>
            )}

            {/* Tier Badge */}
            <TierBadge rank={rank} totalStudents={totalStudents} />
          </div>
        </div>

        {/* Rank Delta */}
        <div className="shrink-0">
          <RankDeltaIndicator rankDelta={rankDelta} isNew={isNew} />
        </div>
      </AdaptiveMotion.div>
    );
  }
);

LeaderboardEntryRow.displayName = 'LeaderboardEntryRow';

// ============================================
// MAIN COMPONENT
// ============================================

// ============================================
// SEPARATOR ROW (for top3 mode gap)
// ============================================

const SeparatorRow = memo(() => (
  <div
    data-testid="leaderboard-separator"
    className="flex items-center justify-center py-2 text-neo-white font-neo-body font-bold text-lg tracking-widest"
  >
    ...
  </div>
));

SeparatorRow.displayName = 'SeparatorRow';

// ============================================
// VISIBILITY FILTER
// ============================================

function filterByVisibility(
  entries: LeaderboardEntryWithDelta[],
  visibility: LeaderboardVisibility,
  currentStudentId: string | undefined
): { visible: LeaderboardEntryWithDelta[]; showSeparator: boolean } {
  if (visibility === 'full') {
    return { visible: entries, showSeparator: false };
  }

  if (visibility === 'personal_only') {
    const me = entries.filter(e => e.userId === currentStudentId);
    return { visible: me, showSeparator: false };
  }

  // top3
  const top3 = entries.filter(e => e.rank <= 3);
  const meInTop3 = top3.some(e => e.userId === currentStudentId);
  if (meInTop3 || !currentStudentId) {
    return { visible: top3, showSeparator: false };
  }
  const me = entries.find(e => e.userId === currentStudentId);
  return {
    visible: me ? [...top3, me] : top3,
    showSeparator: !!me,
  };
}

const ClassroomLeaderboard = memo<ClassroomLeaderboardProps>(
  ({ classroomId, currentUserId, currentStudentId, visibility = 'full', className }) => {
    const { t, dir } = useLanguage();
    const isRTL = dir === 'rtl';

    const { fullList, totalStudents, isLoading, error, timeScope, setTimeScope } =
      useClassroomLeaderboard({
        classroomId,
        currentUserId,
        initialTimeScope: 'weekly',
      });

    const studentId = currentStudentId ?? currentUserId;
    const { visible, showSeparator } = filterByVisibility(fullList, visibility, studentId);

    // hidden mode — render nothing (after hooks to satisfy rules of hooks)
    if (visibility === 'hidden') {
      return null;
    }

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
        <AdaptiveMotion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        >
          <Trophy className="w-5 h-5" />
          <h2 className="font-neo-display font-black text-2xl text-neo-white">
            {t('education.leaderboard.title')}
          </h2>
        </AdaptiveMotion.div>

        {/* Time Scope Tabs */}
        <TimeScopeTabs timeScope={timeScope} onScopeChange={setTimeScope} />

        {/* Student List (filtered by visibility) */}
        <AdaptiveAnimatePresence mode="wait">
          <AdaptiveMotion.div
            key={timeScope}
            className="space-y-3 max-h-[60vh] overflow-y-auto"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {visible.map((entry, index) => {
              // In top3 mode, insert separator before the current student if not in top 3
              const isSeparatorPoint = showSeparator && index === visible.length - 1;
              return (
                <div key={entry.userId}>
                  {isSeparatorPoint && <SeparatorRow />}
                  <LeaderboardEntryRow
                    {...entry}
                    totalStudents={totalStudents}
                    index={index}
                  />
                </div>
              );
            })}
          </AdaptiveMotion.div>
        </AdaptiveAnimatePresence>

        {/* Footer: Total students */}
        <div className="text-center pt-2">
          <p className="font-neo-body text-sm text-neo-white">
            {t('education.leaderboard.studentsInClass', { count: totalStudents })}
          </p>
        </div>
      </div>
    );
  }
);

ClassroomLeaderboard.displayName = 'ClassroomLeaderboard';

export default ClassroomLeaderboard;
