'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { EducationHeader } from '@/components/education/EducationHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { ClassroomGameLobby } from '@/components/education/ClassroomGameLobby';
import { cn } from '@/lib/utils';

/**
 * ClassroomGameInner
 *
 * Education-specific multiplayer game that:
 * - Uses vocabulary from teacher's lessons (optional pre-selection via URL)
 * - Auto-populates with classroom roster
 * - Syncs progress to student records post-game
 * - Uses EducationHeader (no escape to main app)
 *
 * lessonId is optional — when omitted, the lobby lets the teacher pick lessons.
 */
function ClassroomGameInner() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRTL = language === 'he';

  const [isChecking, setIsChecking] = useState(true);

  // Optional lesson ID from URL params (pre-selects a lesson in the lobby)
  const lessonId = searchParams?.get('lessonId') || '';

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push(`/${language}/education`);
      return;
    }

    setIsChecking(false);
  }, [isAuthenticated, authLoading, router, language]);

  const handleBack = useCallback(() => {
    router.push(`/${language}/education`);
  }, [router, language]);

  if (isChecking || authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neo-navy min-h-dvh">
        <PageLoader
          size="lg"
          text={t('common.loading')}
        />
      </div>
    );
  }

  return (
    <div className={cn('flex-1 flex flex-col bg-neo-navy w-full min-h-dvh', isRTL && 'rtl')}>
      <EducationHeader showBackButton title={t('education.classroomGame.title')} />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <ClassroomGameLobby
          initialLessonId={lessonId}
          onBack={handleBack}
        />
      </main>
    </div>
  );
}

import { TeacherGate } from '@/components/education/TeacherGate';

export default function ClassroomGamePage() {
  return <TeacherGate><ClassroomGameInner /></TeacherGate>;
}
