/**
 * StudentLessonView - Simplified Version
 *
 * Clean lesson cards with single primary action
 * Reduced visual clutter, focus on learning
 */

'use client';

import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useStudentProgress } from '@/hooks/useStudentProgress';
import { cn } from '@/lib/utils';
import { NeoLoader } from '@/components/ui/NeoLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { QuickPracticeButton } from '@/components/practice/QuickPracticeButton';
import { BookOpen } from 'lucide-react';
import type { PracticeType } from '@/hooks/usePracticeSession';

export default function StudentLessonView() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const isRTL = language === 'he';
  const { lessons, isLoading, error } = useStudentProgress();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <NeoLoader variant="mascot-letters" size="lg" text={t('common.loading')} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-neo-pink font-neo-body text-lg">{error}</p>
      </div>
    );
  }

  if (lessons.length === 0) {
    return (
      <div className="py-12">
        <EmptyState
          type="custom"
          title={t('student.lessons.empty.title')}
          description={t('student.lessons.empty.subtitle')}
          icon={<BookOpen className="w-full h-full text-neo-cyan" />}
          showMascot={false}
          size="lg"
          action={
            <Button
              onClick={() => router.push(`/${language}/student/join`)}
              size="lg"
              className={cn(
                'font-neo-display text-base px-8',
                'bg-neo-cyan hover:bg-neo-cyan/90',
                'text-neo-black shadow-hard hover:shadow-hard-lg',
                'border-neo border-neo-black'
              )}
            >
              {t('student.lessons.empty.joinClassroom')}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Simplified: Show lessons sorted by status (assigned → started → completed) */}
      {lessons.map((studentLesson) => {
        const { status, lesson, progress } = studentLesson;

        // Calculate progress stats
        const lessonWords = lesson?.words || [];
        const totalWords = lessonWords.length || 1;
        const masteredWords = (progress?.words_mastered || []).length;
        const masteryPercent = progress
          ? Math.round((masteredWords / totalWords) * 100)
          : 0;

        // Get lesson name
        const lessonName = lesson?.name || `${t('student.lessons.lesson')} #${studentLesson.lessonId.slice(0, 6)}`;

        return (
          <div
            key={studentLesson.lessonId}
            className={cn(
              'p-6 rounded-neo border-neo border-neo-black bg-neo-navy/80',
              'shadow-hard hover:shadow-hard-lg transition-all',
              // Subtle status indicators via border color
              status === 'assigned' && 'border-neo-cyan',
              status === 'completed' && 'border-neo-yellow'
            )}
          >
            <div className="flex items-center justify-between gap-4">
              {/* Left: Lesson info */}
              <div className="flex-1">
                {/* Lesson name */}
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-neo-display text-neo-white">
                    {lessonName}
                  </h3>

                  {/* Status badge */}
                  {status === 'assigned' && (
                    <span className="px-2 py-1 bg-neo-cyan/20 text-neo-cyan text-xs font-bold rounded-neo border border-neo-cyan/50">
                      NEW
                    </span>
                  )}
                  {status === 'completed' && (
                    <span className="px-2 py-1 bg-neo-yellow/20 text-neo-yellow text-xs font-bold rounded-neo border border-neo-yellow/50">
                      ✓ DONE
                    </span>
                  )}
                </div>

                {/* Progress info - compact */}
                <div className="flex items-center gap-6 text-sm text-neo-white/70">
                  <span>{totalWords} {t('student.lessons.words')}</span>

                  {/* Show progress for started/completed */}
                  {status !== 'assigned' && progress && (
                    <>
                      <span className="text-neo-cyan font-bold">
                        {masteredWords} {t('student.lessons.mastered')}
                      </span>
                      <span className="text-neo-yellow font-bold">
                        {masteryPercent}% {t('student.lessons.complete')}
                      </span>
                    </>
                  )}
                </div>

                {/* Progress bar for started/completed - uses scaleX for compositor-only animation */}
                {status !== 'assigned' && progress && (
                  <div className="mt-3 w-full h-2 bg-neo-black border border-neo-black overflow-hidden rounded">
                    <div
                      className={cn(
                        'h-full w-full origin-left transition-transform duration-300',
                        status === 'completed' ? 'bg-neo-yellow' : 'bg-neo-cyan'
                      )}
                      style={{ transform: `scaleX(${masteryPercent / 100})` }}
                    />
                  </div>
                )}
              </div>

              {/* Right: Quick practice button with mode dropdown */}
              <div>
                <QuickPracticeButton
                  lessonId={studentLesson.lessonId}
                  onPractice={(mode: PracticeType) => {
                    router.push(`/${language}/student/lessons/${studentLesson.lessonId}?mode=${mode}`);
                  }}
                  size="lg"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
