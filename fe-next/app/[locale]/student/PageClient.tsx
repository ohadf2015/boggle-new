/**
 * Student Dashboard Page
 *
 * Shows assigned vocabulary lessons with progress tracking + classroom leaderboard
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStudentClassroom } from '@/hooks/useStudentClassroom';
import { EducationHeader } from '@/components/education/EducationHeader';
import { NeoLoader } from '@/components/ui/NeoLoader';
import StudentLessonView from '@/components/student/StudentLessonView';
import { ClassroomGameBanner } from '@/components/student/ClassroomGameBanner';
import { cn } from '@/lib/utils';

// Dynamic import with ssr: false to avoid CommonJS/ESM interop issues
// with framer-motion on older mobile browsers (fixes JAVASCRIPT-NEXTJS-19)
const ClassroomLeaderboard = dynamic(
  () => import('@/components/education/ClassroomLeaderboard').then(mod => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="p-6 rounded-neo border-neo border-neo-black bg-neo-navy/50 animate-pulse">
        <div className="h-6 bg-neo-white/10 rounded mb-4 w-2/3" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-neo-white/5 rounded" />
          ))}
        </div>
      </div>
    ),
  }
);

export default function StudentPageClient() {
  const { user, isAuthenticated, loading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const isRTL = language === 'he';
  const [isChecking, setIsChecking] = useState(true);
  const { classroomId } = useStudentClassroom();

  useEffect(() => {
    // Wait for auth to finish loading before checking authentication
    if (loading) {
      return; // Still loading, don't make any decisions yet
    }

    // Check authentication (only after loading completes)
    if (!isAuthenticated) {
      router.push(`/${language}`);
      return;
    }

    setIsChecking(false);
  }, [isAuthenticated, loading, router, language]);

  // Show loader during auth check or while auth is loading
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

      {/* Reduced padding: mobile 12px, sm 16px (was 24px) */}
      <div className="w-full max-w-7xl mx-auto px-4 py-3 sm:py-4 sm:px-6 lg:px-8 flex-1">
        {/* Page Header */}
        {/* Reduced margin: mobile 12px, sm 16px (was 32px) */}
        <div className="mb-3 sm:mb-4">
          <h1 className="text-3xl font-neo-display text-neo-white mb-1">
            {t('student.dashboard.title')}
          </h1>
          <p className="text-neo-white/70 font-neo-body">
            {t('student.dashboard.subtitle')}
          </p>
        </div>

        {/* Classroom Game Banner (if active game exists) */}
        {classroomId && (
          <ClassroomGameBanner
            classroomId={classroomId}
            userId={user.id}
            username={user.email || 'Student'}
          />
        )}

        {/* Main Content Grid */}
        {/* Reduced gap: mobile 16px, lg 24px (was 32px) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Lesson List - Takes up 2 columns on desktop */}
          <div className="lg:col-span-2">
            <StudentLessonView />
          </div>

          {/* Classroom Leaderboard - Sidebar on desktop, below lessons on mobile */}
          {classroomId ? (
            <aside className="lg:col-span-1">
              <ClassroomLeaderboard
                classroomId={classroomId}
                currentUserId={user.id}
                className="sticky top-6"
              />
            </aside>
          ) : (
            <aside className="lg:col-span-1 p-6 rounded-neo border-neo border-neo-black bg-neo-navy/50 text-center">
              <p className="text-neo-white/70 font-neo-body">
                {t('education.leaderboard.joinClassroomPrompt')}
              </p>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
