/**
 * Student Dashboard - Simplified Version
 *
 * Single-column layout with inline progress indicators
 * Focuses on lessons with minimal distractions
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStudentClassroom } from '@/hooks/useStudentClassroom';
import { useClassroomLeaderboard } from '@/hooks/useClassroomLeaderboard';
import { useWinStreak } from '@/hooks/useWinStreak';
import { EducationHeader } from '@/components/education/EducationHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import StudentLessonView from '@/components/student/StudentLessonView';
import { ClassroomGameBanner } from '@/components/student/ClassroomGameBanner';
import { cn } from '@/lib/utils';
import { Trophy, Flame } from 'lucide-react';

// Inline progress indicator component (replaces sidebar)
function StudentProgress({ classroomId, userId }: { classroomId: string; userId: string }) {
  const { t } = useLanguage();

  // Fetch real leaderboard data
  const { topThree, currentUserRank, isLoading: leaderboardLoading } = useClassroomLeaderboard({
    classroomId,
    currentUserId: userId,
    timeScope: 'all-time',
  });

  // Get win streak data
  const { currentStreak, isLoaded: streakLoaded } = useWinStreak();

  // Determine user's rank and XP
  // If user is in top 3, find them there; otherwise use currentUserRank
  const userInTopThree = topThree.find((entry) => entry.isCurrentUser);
  const userEntry = userInTopThree || currentUserRank;

  // Show skeleton while loading
  if (leaderboardLoading || !streakLoaded) {
    return (
      <div className="flex items-center gap-4 p-4 rounded-neo border-neo border-neo-black bg-neo-navy/50 shadow-hard-sm animate-pulse">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-neo-white/10 rounded" />
          <div>
            <div className="h-3 w-12 bg-neo-white/10 rounded mb-1" />
            <div className="h-5 w-8 bg-neo-white/10 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-neo-white/10 rounded-full" />
          <div>
            <div className="h-3 w-12 bg-neo-white/10 rounded mb-1" />
            <div className="h-5 w-16 bg-neo-white/10 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-neo-white/10 rounded" />
          <div>
            <div className="h-3 w-12 bg-neo-white/10 rounded mb-1" />
            <div className="h-5 w-16 bg-neo-white/10 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // If no user data found (new student with no activity), show placeholder
  const rank = userEntry?.rank ?? '-';
  const totalXP = userEntry?.totalXp ?? 0;

  return (
    <div className="flex items-center gap-4 p-4 rounded-neo border-neo border-neo-black bg-neo-navy/50 shadow-hard-sm">
      {/* Rank */}
      <div className="flex items-center gap-2">
        <Trophy className="w-5 h-5 text-neo-yellow" />
        <div>
          <p className="text-xs text-neo-white/50">{t('education.leaderboard.rank')}</p>
          <p className="text-lg font-bold text-neo-yellow tabular-nums">
            {typeof rank === 'number' ? `#${rank}` : rank}
          </p>
        </div>
      </div>

      {/* XP */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-neo-cyan/20 flex items-center justify-center">
          <span className="text-neo-cyan font-bold text-sm">XP</span>
        </div>
        <div>
          <p className="text-xs text-neo-white/50">{t('education.leaderboard.totalXP')}</p>
          <p className="text-lg font-bold text-neo-cyan tabular-nums">{totalXP.toLocaleString()}</p>
        </div>
      </div>

      {/* Streak */}
      <div className="flex items-center gap-2">
        <Flame className="w-5 h-5 text-neo-orange" />
        <div>
          <p className="text-xs text-neo-white/50">{t('education.leaderboard.streak')}</p>
          <p className="text-lg font-bold text-neo-orange tabular-nums">
            {currentStreak} {t('common.days')}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function StudentPageClient() {
  const { user, isAuthenticated, loading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const isRTL = language === 'he';
  const [isChecking, setIsChecking] = useState(true);
  const { classroomId } = useStudentClassroom();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!isAuthenticated) {
      router.push(`/${language}`);
      return;
    }

    setIsChecking(false);
  }, [isAuthenticated, loading, router, language]);

  // Show loader during auth check
  if (isChecking || loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neo-navy">
        <PageLoader size="lg" text={t('common.loading')} />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className={cn('flex-1 flex flex-col bg-neo-navy w-full overflow-x-hidden', isRTL && 'rtl')}>
      <EducationHeader />

      {/* Single-column content - simpler! */}
      <div className="w-full max-w-5xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex-1">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-neo-display text-neo-white mb-2 text-balance">
            {t('student.dashboard.title')}
          </h1>
          <p className="text-neo-white/70 font-neo-body text-pretty">
            {t('student.dashboard.subtitle')}
          </p>
        </div>

        {/* Classroom Game Banner (if active) */}
        {classroomId && (
          <div className="mb-6">
            <ClassroomGameBanner
              classroomId={classroomId}
              userId={user.id}
              username={user.email || 'Student'}
            />
          </div>
        )}

        {/* Inline Progress (replaces sidebar) */}
        {classroomId && (
          <div className="mb-6">
            <StudentProgress classroomId={classroomId} userId={user.id} />
          </div>
        )}

        {/* Lesson List - Full width, no sidebar */}
        <StudentLessonView />
      </div>
    </div>
  );
}
