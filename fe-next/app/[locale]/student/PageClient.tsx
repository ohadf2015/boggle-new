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
import { useStudentProgress } from '@/hooks/useStudentProgress';
import Header from '@/components/Header';
import { NeoLoader } from '@/components/ui/NeoLoader';
import StudentLessonView from '@/components/student/StudentLessonView';
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
  const { user, isAuthenticated } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const isRTL = language === 'he';
  const [isChecking, setIsChecking] = useState(true);
  const { lessons } = useStudentProgress();

  useEffect(() => {
    // Check authentication
    if (!isAuthenticated) {
      router.push(`/${language}`);
      return;
    }

    setIsChecking(false);
  }, [isAuthenticated, router, language]);

  if (isChecking) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neo-navy">
        <NeoLoader variant="mascot-letters" size="lg" text={t('common.loading')} />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Get classroom ID from first lesson (all lessons should have same classroom_id)
  const classroomId = lessons.length > 0 ? lessons[0].classroomId : null;

  return (
    <div className={cn('flex-1 flex flex-col bg-neo-navy w-full overflow-x-hidden', isRTL && 'rtl')}>
      <Header />

      <div className="w-full max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex-1">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-neo-display text-neo-white mb-2">
            {t('student.dashboard.title')}
          </h1>
          <p className="text-neo-white/70 font-neo-body">
            {t('student.dashboard.subtitle')}
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
