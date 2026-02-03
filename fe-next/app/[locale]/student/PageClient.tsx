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
import { EducationHeader } from '@/components/education/EducationHeader';
import { NeoLoader } from '@/components/ui/NeoLoader';
import StudentLessonView from '@/components/student/StudentLessonView';
import { ClassroomGameBanner } from '@/components/student/ClassroomGameBanner';
import { cn } from '@/lib/utils';
import { Trophy, Flame } from 'lucide-react';

// Inline progress indicator component (replaces sidebar)
function StudentProgress({ classroomId, userId }: { classroomId: string; userId: string }) {
  const { t } = useLanguage();
  const [progressData, setProgressData] = useState<{
    rank: number;
    totalXP: number;
    streak: number;
  } | null>(null);

  // TODO: Fetch actual progress data from classroom leaderboard
  // For now showing placeholder
  useEffect(() => {
    // Mock data - replace with actual API call
    setProgressData({
      rank: 3,
      totalXP: 1250,
      streak: 5,
    });
  }, [classroomId, userId]);

  if (!progressData) return null;

  return (
    <div className="flex items-center gap-4 p-4 rounded-neo border-neo border-neo-black bg-neo-navy/50 shadow-hard-sm">
      {/* Rank */}
      <div className="flex items-center gap-2">
        <Trophy className="w-5 h-5 text-neo-yellow" />
        <div>
          <p className="text-xs text-neo-white/50">{t('education.leaderboard.rank')}</p>
          <p className="text-lg font-bold text-neo-yellow">#{progressData.rank}</p>
        </div>
      </div>

      {/* XP */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-neo-cyan/20 flex items-center justify-center">
          <span className="text-neo-cyan font-bold text-sm">XP</span>
        </div>
        <div>
          <p className="text-xs text-neo-white/50">{t('education.leaderboard.totalXP')}</p>
          <p className="text-lg font-bold text-neo-cyan">{progressData.totalXP}</p>
        </div>
      </div>

      {/* Streak */}
      <div className="flex items-center gap-2">
        <Flame className="w-5 h-5 text-neo-orange" />
        <div>
          <p className="text-xs text-neo-white/50">{t('education.leaderboard.streak')}</p>
          <p className="text-lg font-bold text-neo-orange">{progressData.streak} {t('common.days')}</p>
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
        <NeoLoader variant="mascot-letters" size="lg" text={t('common.loading')} />
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
          <h1 className="text-3xl font-neo-display text-neo-white mb-2">
            {t('student.dashboard.title')}
          </h1>
          <p className="text-neo-white/70 font-neo-body">
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
