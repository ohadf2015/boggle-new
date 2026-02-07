'use client';

/**
 * ClassroomLeaderboard - Classroom-scoped Leaderboard Component
 *
 * Displays top 3 students by XP in a classroom + current student's rank.
 * Privacy-conscious design: only shows classroom students, not global leaderboard.
 *
 * Features:
 * - Top 3 with rank badges (gold/silver/bronze)
 * - Current user highlight
 * - Inactive student indicator (7+ days)
 * - Neo-brutalist styling
 * - RTL support
 */

import { memo } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassroomLeaderboard } from '@/hooks/useClassroomLeaderboard';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';

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
// RANK BADGE CONFIG
// ============================================

const RANK_COLORS = {
  1: {
    bg: 'bg-neo-yellow',
    text: 'text-neo-black',
    border: 'border-neo-black',
    emoji: '🥇',
  },
  2: {
    // Silver uses slate background for better contrast in dark UI
    bg: 'bg-slate-300',
    text: 'text-neo-black',
    border: 'border-neo-black',
    emoji: '🥈',
  },
  3: {
    bg: 'bg-neo-orange',
    text: 'text-neo-white',
    border: 'border-neo-black',
    emoji: '🥉',
  },
} as const;


// ============================================
// LEADERBOARD ENTRY
// ============================================

interface LeaderboardEntryCardProps {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  totalXp: number;
  currentLevel: number;
  rank: number;
  isCurrentUser: boolean;
  isInactive: boolean;
}

const LeaderboardEntryCard = memo<LeaderboardEntryCardProps>(
  ({ userId, displayName, avatarUrl, totalXp, currentLevel, rank, isCurrentUser, isInactive }) => {
    const { t } = useLanguage();
    const rankConfig = RANK_COLORS[rank as 1 | 2 | 3];

    return (
      <motion.div
        data-testid={isCurrentUser ? 'leaderboard-entry-current-user' : `leaderboard-entry-${userId}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: isInactive ? 0.5 : 1, y: 0 }}
        transition={{ duration: 0.3, delay: rank * 0.1 }}
        className={cn(
          'relative p-4 rounded-neo border-neo shadow-hard',
          'flex items-center gap-4',
          isCurrentUser
            ? 'bg-neo-cyan/20 border-neo-cyan'
            : 'bg-neo-navy border-neo-black',
          isInactive && 'opacity-50'
        )}
      >
        {/* Rank Badge */}
        {rankConfig && (
          <div
            data-testid={`rank-badge-${rank}`}
            className={cn(
              'flex-shrink-0 w-12 h-12 rounded-neo border-neo',
              'flex items-center justify-center',
              'font-neo-display font-black text-xl',
              rankConfig.bg,
              rankConfig.text,
              rankConfig.border
            )}
          >
            {rankConfig.emoji}
          </div>
        )}

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
          <div className="flex items-center gap-2">
            <p className="font-neo-display font-bold text-neo-white truncate">
              {displayName}
            </p>
            {isInactive && (
              <span className="px-2 py-0.5 text-xs font-neo-body bg-neo-black/50 text-neo-white/70 rounded">
                {t('education.leaderboard.inactive')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1">
            {/* XP */}
            <span className="font-neo-body font-bold text-neo-yellow text-sm">
              {t('education.leaderboard.xp', { xp: totalXp })}
            </span>

            {/* Level */}
            <span className="px-2 py-0.5 text-xs font-neo-body bg-neo-cyan text-neo-black rounded">
              {t('education.leaderboard.level', { level: currentLevel })}
            </span>
          </div>
        </div>
      </motion.div>
    );
  }
);

LeaderboardEntryCard.displayName = 'LeaderboardEntryCard';

// ============================================
// MAIN COMPONENT
// ============================================

const ClassroomLeaderboard = memo<ClassroomLeaderboardProps>(
  ({ classroomId, currentUserId, className }) => {
    const { t, dir } = useLanguage();
    const isRTL = dir === 'rtl';

    const { topThree, currentUserRank, totalStudents, isLoading, error } =
      useClassroomLeaderboard({
        classroomId,
        currentUserId,
        timeScope: 'all-time',
      });

    // Loading state
    if (isLoading) {
      return (
        <div data-testid="leaderboard-skeleton" className={cn('w-full flex justify-center py-8', className)}>
          <Loader size="md" />
        </div>
      );
    }

    // Error state (silent fail - just show empty)
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

        {/* Top 3 Section */}
        <div className="space-y-3">
          {topThree.map((entry) => (
            <LeaderboardEntryCard key={entry.userId} {...entry} />
          ))}
        </div>

        {/* Separator (only if there's a "Your Position" section) */}
        {currentUserRank && (
          <div className="border-t-2 border-neo-black/30 my-4" />
        )}

        {/* Your Position Section (if not in top 3) */}
        {currentUserRank && (
          <div>
            <h3 className="font-neo-display font-bold text-lg text-neo-white/80 mb-2">
              {t('education.leaderboard.yourPosition')}
            </h3>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={cn(
                'p-4 rounded-neo border-neo shadow-hard',
                'flex items-center gap-4',
                'bg-neo-yellow/20 border-neo-yellow'
              )}
            >
              {/* Rank number */}
              <div className="flex-shrink-0 w-12 h-12 rounded-neo border-neo bg-neo-yellow border-neo-black flex items-center justify-center">
                <span className="font-neo-display font-black text-xl text-neo-black">
                  #{currentUserRank.rank}
                </span>
              </div>

              {/* Avatar */}
              {currentUserRank.avatarUrl ? (
                <Image
                  src={currentUserRank.avatarUrl}
                  alt={`${currentUserRank.displayName}'s avatar`}
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
                <p className="font-neo-display font-bold text-neo-white">
                  {t('education.leaderboard.youAreRank', { rank: currentUserRank.rank })}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-neo-body font-bold text-neo-yellow text-sm">
                    {t('education.leaderboard.xp', { xp: currentUserRank.totalXp })}
                  </span>
                  <span className="px-2 py-0.5 text-xs font-neo-body bg-neo-cyan text-neo-black rounded">
                    {t('education.leaderboard.level', { level: currentUserRank.currentLevel })}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        )}

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
