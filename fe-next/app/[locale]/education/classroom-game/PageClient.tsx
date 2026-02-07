'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLesson } from '@/hooks/useVocabularyLesson';
import { EducationHeader } from '@/components/education/EducationHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { ClassroomGameLobby } from '@/components/education/ClassroomGameLobby';
import { cn } from '@/lib/utils';

/**
 * Classroom Game Page
 *
 * Education-specific multiplayer game that:
 * - Uses vocabulary from a lesson
 * - Auto-populates with classroom roster
 * - Syncs progress to student records post-game
 * - Uses EducationHeader (no escape to main app)
 */
export default function ClassroomGamePageClient() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRTL = language === 'he';

  const [isChecking, setIsChecking] = useState(true);

  // Get lesson ID from URL params
  const lessonId = searchParams?.get('lessonId') || '';

  // Fetch lesson data
  const { lesson, isLoading: lessonLoading } = useLesson(lessonId);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    // Check authentication
    if (!isAuthenticated) {
      router.push(`/${language}/education`);
      return;
    }

    // Check for lesson ID
    if (!lessonId) {
      router.push(`/${language}/education`);
      return;
    }

    setIsChecking(false);
  }, [isAuthenticated, authLoading, lessonId, router, language]);

  // Handle back to education
  const handleBack = useCallback(() => {
    router.push(`/${language}/education`);
  }, [router, language]);

  // Show loader during auth check or lesson loading
  if (isChecking || authLoading || lessonLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neo-navy min-h-screen">
        <PageLoader
          size="lg"
          text={t('common.loading') || 'Loading...'}
        />
      </div>
    );
  }

  // No lesson found
  if (!lesson) {
    return (
      <div className={cn('flex-1 flex flex-col bg-neo-navy w-full min-h-screen', isRTL && 'rtl')}>
        <EducationHeader showBackButton />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <h2 className="text-2xl font-neo-display text-neo-white mb-4">
              {t('education.classroomGame.lessonNotFound') || 'Lesson Not Found'}
            </h2>
            <p className="text-neo-white/70 mb-6">
              {t('education.classroomGame.lessonNotFoundDesc') || 'The requested lesson could not be found.'}
            </p>
            <button
              onClick={handleBack}
              className={cn(
                'px-6 py-3 font-bold',
                'bg-neo-cyan text-neo-black',
                'border-neo border-neo-black rounded-neo shadow-hard',
                'hover:shadow-hard-lg transition-all'
              )}
            >
              {t('education.classroomGame.backToEducation') || 'Back to Education'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex-1 flex flex-col bg-neo-navy w-full min-h-screen', isRTL && 'rtl')}>
      <EducationHeader showBackButton title={lesson?.name || t('education.classroomGame.title')} />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <ClassroomGameLobby
          initialLessonId={lessonId}
          onBack={handleBack}
        />
      </main>
    </div>
  );
}
