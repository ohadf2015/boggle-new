/**
 * StudentLessonView - Animated Accent-border Design
 *
 * Glass-dark cards with staggered entrance animations,
 * spring hover effects, pulsing NEW badges, and lucide icons.
 */

'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStudentProgress } from '@/hooks/useStudentProgress';
import { cn } from '@/lib/utils';
import { PageLoader } from '@/components/ui/PageLoader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { QuickPracticeButton } from '@/components/practice/QuickPracticeButton';
import { BookOpen, Award, Activity } from 'lucide-react';
import type { PracticeType } from '@/hooks/usePracticeSession';

// --- Animation variants ---

const listContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const cardEntrance = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

const headerEntrance = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

const countBadgePop = {
  hidden: { scale: 0 },
  visible: {
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 500, damping: 15, delay: 0.3 },
  },
};

const progressBarFill = {
  hidden: { width: 0 },
  visible: (percent: number) => ({
    width: `${percent}%`,
    transition: { type: 'spring' as const, stiffness: 60, damping: 20, delay: 0.3 },
  }),
};

export default function StudentLessonView() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { lessons, isLoading, error } = useStudentProgress();

  const activeLessonCount = lessons.filter((l) => l.status !== 'completed').length;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <PageLoader size="lg" text={t('common.loading')} />
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
          showMascot
          mascotVariant="thinking"
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
    <motion.div
      className="space-y-4"
      variants={listContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Section header */}
      <motion.div variants={headerEntrance} className="flex items-center gap-3 mb-2">
        <h2 className="text-2xl font-neo-display text-neo-white">
          {t('student.dashboard.title')}
        </h2>
        {activeLessonCount > 0 && (
          <motion.span
            variants={countBadgePop}
            className="px-2.5 py-0.5 bg-neo-cyan/20 text-neo-cyan text-sm font-bold rounded-full tabular-nums"
          >
            {activeLessonCount}
          </motion.span>
        )}
      </motion.div>

      {lessons.map((studentLesson) => {
        const { status, lesson, progress } = studentLesson;

        const lessonWords = lesson?.words || [];
        const totalWords = lessonWords.length || 1;
        const masteredWords = (progress?.words_mastered || []).length;
        const masteryPercent = progress
          ? Math.round((masteredWords / totalWords) * 100)
          : 0;

        const lessonName = lesson?.name || `${t('student.lessons.lesson')} #${studentLesson.lessonId.slice(0, 6)}`;

        // Accent border color per status
        const accentBorder =
          status === 'assigned'
            ? 'border-s-neo-cyan'
            : status === 'completed'
              ? 'border-s-neo-yellow'
              : 'border-s-neo-white/20';

        // Progress bar fill color
        const fillColor = status === 'completed' ? 'bg-neo-yellow' : 'bg-neo-cyan';

        return (
          <motion.div
            key={studentLesson.lessonId}
            variants={cardEntrance}
            whileHover={{
              x: 6,
              boxShadow: '6px 6px 0px rgba(0,0,0,0.3)',
              transition: { type: 'spring', stiffness: 400, damping: 25 },
            }}
            whileTap={{ scale: 0.99 }}
            className={cn(
              'p-6 rounded-neo border border-neo-black/50',
              'bg-neo-navy/40 backdrop-blur-sm',
              'border-s-[6px]', accentBorder,
              'cursor-default'
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Lesson info */}
              <div className="flex-1 min-w-0">
                {/* Lesson name + badge */}
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-neo-display text-neo-white truncate">
                    {lessonName}
                  </h3>

                  {status === 'assigned' && (
                    <span className="flex-shrink-0 px-2 py-1 bg-neo-cyan/20 text-neo-cyan text-xs font-bold rounded-neo border border-neo-cyan/50 animate-pulse-subtle">
                      NEW
                    </span>
                  )}
                  {status === 'completed' && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      className="flex-shrink-0 px-2 py-1 bg-neo-yellow/20 text-neo-yellow text-xs font-bold rounded-neo border border-neo-yellow/50"
                    >
                      ✓ DONE
                    </motion.span>
                  )}
                </div>

                {/* Stats row with icons */}
                <div className="flex items-center gap-5 text-sm text-neo-white/60">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    {totalWords} {t('student.lessons.words')}
                  </span>

                  {status !== 'assigned' && progress && (
                    <>
                      <span className="flex items-center gap-1.5 text-neo-cyan font-bold">
                        <Award className="w-4 h-4" />
                        {masteredWords} {t('student.lessons.mastered')}
                      </span>
                      <span className="flex items-center gap-1.5 text-neo-yellow font-bold">
                        <Activity className="w-4 h-4" />
                        {masteryPercent}%
                      </span>
                    </>
                  )}
                </div>

                {/* Animated progress bar */}
                {status !== 'assigned' && progress && (
                  <div className="mt-3 w-full h-2 rounded-full bg-black/40 overflow-hidden">
                    <motion.div
                      className={cn('h-full rounded-full', fillColor)}
                      variants={progressBarFill}
                      custom={masteryPercent}
                    />
                  </div>
                )}
              </div>

              {/* Practice button */}
              <div className="sm:flex-shrink-0 w-full sm:w-auto">
                <QuickPracticeButton
                  lessonId={studentLesson.lessonId}
                  onPractice={(mode: PracticeType) => {
                    router.push(`/${language}/student/lessons/${studentLesson.lessonId}?mode=${mode}`);
                  }}
                  size="lg"
                  className="w-full sm:w-auto"
                />
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
