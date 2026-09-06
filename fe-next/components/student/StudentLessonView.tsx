/**
 * StudentLessonView - Playful Game Quest Log
 *
 * Bouncier spring entrances, alternating card tilt, glowing NEW badge,
 * bouncy DONE celebration, richer hover/tap feedback.
 */

'use client';

import { useRouter } from 'next/navigation';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStudentProgress } from '@/hooks/useStudentProgress';
import { useStudentClassroom } from '@/hooks/useStudentClassroom';
import { wordsForLevel } from '@/lib/education/differentiation';
import { cn } from '@/lib/utils';
import { PageLoader } from '@/components/ui/PageLoader';
import { EnhancedEmptyState } from '@/components/ui/EnhancedEmptyState';
import { Button } from '@/components/ui/button';
import { QuickPracticeButton } from '@/components/practice/QuickPracticeButton';
import { BookOpen, Award, Activity, Star, Crosshair } from 'lucide-react';
import type { PracticeType } from '@/hooks/usePracticeSession';
import { readAssignmentFocus, focusPracticeHref } from '@/lib/education/vocabFocus';

// --- Animation variants ---

const listContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
};

// Bouncier spring — gives each card a satisfying pop on entrance
const cardEntrance = {
  hidden: { opacity: 0, y: 28, scale: 0.94 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 420, damping: 16 },
  },
};

const headerEntrance = {
  hidden: { opacity: 0, x: -16 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring' as const, stiffness: 380, damping: 22 },
  },
};

const countBadgePop = {
  hidden: { scale: 0, rotate: -15 },
  visible: {
    scale: 1,
    rotate: 0,
    transition: { type: 'spring' as const, stiffness: 600, damping: 14, delay: 0.35 },
  },
};

const progressBarFill = {
  hidden: { width: 0 },
  visible: (percent: number) => ({
    width: `${percent}%`,
    transition: { type: 'spring' as const, stiffness: 55, damping: 18, delay: 0.4 },
  }),
};

const doneBadge = {
  hidden: { scale: 0, rotate: -10 },
  visible: {
    scale: 1,
    rotate: [0, 8, -5, 3, 0],
    transition: { type: 'spring' as const, stiffness: 500, damping: 12 },
  },
};

export default function StudentLessonView() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { lessons, isLoading, error } = useStudentProgress();
  // Per-student differentiation: the count / mastery denominator is the words THIS
  // student practises at their level, not the whole lesson — otherwise a support
  // student can never reach 100%.
  const { level } = useStudentClassroom();

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
        <EnhancedEmptyState
          title={t('student.lessons.empty.title')}
          description={t('student.lessons.empty.subtitle')}
          mascotVariant="thinking"
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
    <AdaptiveMotion.div
      className="space-y-4"
      variants={listContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Section header */}
      <AdaptiveMotion.div variants={headerEntrance} className="flex items-center gap-3 mb-2">
        <h2 className="text-2xl font-neo-display font-black text-neo-white">
          {t('student.dashboard.title')}
        </h2>
        <AdaptiveAnimatePresence>
          {activeLessonCount > 0 && (
            <AdaptiveMotion.span
              key="count"
              variants={countBadgePop}
              initial="hidden"
              animate="visible"
              exit={{ scale: 0, opacity: 0, transition: { duration: 0.15 } }}
              className="px-2.5 py-0.5 bg-neo-cyan border-2 border-black text-black text-sm font-black rounded-neo shadow-hard-sm tabular-nums"
            >
              {activeLessonCount}
            </AdaptiveMotion.span>
          )}
        </AdaptiveAnimatePresence>
      </AdaptiveMotion.div>

      {lessons.map((studentLesson, index) => {
        const { status, lesson, progress } = studentLesson;

        const lessonWords = wordsForLevel(lesson?.words || [], level);
        // Two true numbers that disagreed on screen: the card said "8 Words"
        // (this student's level) while a sibling pill said "10 words due" (the
        // lesson). Keep the level-filtered count — a support student must be
        // able to reach 100% — and name the population when the two differ.
        const wordsAtLevel = lessonWords.length;
        const wordsInLesson = (lesson?.words || []).length;
        // `|| 1` is a divide-by-zero guard for the mastery percentage ONLY. It
        // was also being rendered, telling a student with nothing at their level
        // that they had "1 Word" they could never find.
        const totalWords = wordsAtLevel || 1;
        const masteredWords = (progress?.words_mastered || []).length;
        const masteryPercent = progress ? Math.round((masteredWords / totalWords) * 100) : 0;

        const lessonName =
          lesson?.name || `${t('student.lessons.lesson')} #${studentLesson.lessonId.slice(0, 6)}`;
        // Teacher pinned one vocabulary skill on this assignment → offer it first
        const assignedFocus = readAssignmentFocus(studentLesson.assignment);

        // Card colors per status
        const cardBg =
          status === 'assigned' ? 'bg-neo-navy' : status === 'completed' ? 'bg-neo-lime/10' : 'bg-neo-navy';
        const accentBar =
          status === 'assigned' ? 'bg-neo-cyan' : status === 'completed' ? 'bg-neo-lime' : 'bg-black/20';
        const fillColor = status === 'completed' ? 'bg-neo-lime' : 'bg-neo-cyan';

        // Alternating slight tilt for visual rhythm
        const cardTilt = index % 2 === 0 ? -0.4 : 0.4;

        return (
          <AdaptiveMotion.div
            key={studentLesson.lessonId}
            variants={cardEntrance}
            style={{ transform: `rotate(${cardTilt}deg)` }}
            whileHover={{
              rotate: 0,
              y: -5,
              x: -2,
              boxShadow: '8px 8px 0px black',
              transition: { type: 'spring', stiffness: 420, damping: 22 },
            }}
            whileTap={{
              scale: 0.98,
              rotate: 0,
              y: 1,
              boxShadow: '2px 2px 0px black',
              transition: { duration: 0.08 },
            }}
            className={cn(
              'flex rounded-neo border-3 border-black shadow-hard-sm overflow-hidden cursor-default',
              cardBg
            )}
          >
            {/* Accent bar */}
            <div className={cn('w-1.5 shrink-0', accentBar)} />

            <div className="flex-1 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Lesson info */}
                <div className="flex-1 min-w-0">
                  {/* Name + status badge */}
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="text-xl font-neo-display font-black text-black truncate">
                      {lessonName}
                    </h3>

                    {status === 'assigned' && (
                      <AdaptiveMotion.span
                        animate={{
                          scale: [1, 1.08, 1],
                          boxShadow: [
                            '2px 2px 0px black, 0 0 0px rgba(0,255,255,0)',
                            '2px 2px 0px black, 0 0 10px rgba(0,255,255,0.4)',
                            '2px 2px 0px black, 0 0 0px rgba(0,255,255,0)',
                          ],
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        className="shrink-0 flex items-center gap-1 px-2 py-0.5 bg-neo-cyan border-2 border-black text-black text-xs font-black rounded-neo shadow-hard-sm"
                      >
                        <Star className="w-3 h-3 fill-current" />
                        NEW
                      </AdaptiveMotion.span>
                    )}

                    {status === 'completed' && (
                      <AdaptiveMotion.span
                        variants={doneBadge}
                        initial="hidden"
                        animate="visible"
                        className="shrink-0 px-2 py-0.5 bg-neo-lime border-2 border-black text-black text-xs font-black rounded-neo shadow-hard-sm"
                      >
                        ✓ DONE
                      </AdaptiveMotion.span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm flex-wrap">
                    <span className="flex items-center gap-1.5 font-bold text-black/60">
                      <BookOpen className="w-4 h-4" />
                      {wordsInLesson > wordsAtLevel
                        ? t('student.lessons.wordsAtYourLevel', {
                            mine: wordsAtLevel,
                            total: wordsInLesson,
                          })
                        : `${wordsAtLevel} ${t('student.lessons.words')}`}
                    </span>

                    {status !== 'assigned' && progress && (
                      <>
                        <span className="flex items-center gap-1.5 font-black text-black">
                          <Award className="w-4 h-4 text-neo-cyan" />
                          {masteredWords} {t('student.lessons.mastered')}
                        </span>
                        <AdaptiveMotion.span
                          className="flex items-center gap-1.5 font-black text-black"
                          animate={masteryPercent === 100 ? { scale: [1, 1.15, 1] } : {}}
                          transition={{ duration: 0.6, delay: 0.8 }}
                        >
                          <Activity className="w-4 h-4 text-neo-lime" />
                          {masteryPercent}%
                        </AdaptiveMotion.span>
                      </>
                    )}
                  </div>

                  {/* Animated progress bar */}
                  {status !== 'assigned' && progress && (
                    <div className="mt-3 w-full h-3 rounded-neo border-2 border-black bg-black/10 overflow-hidden">
                      <AdaptiveMotion.div
                        className={cn('h-full rounded-neo', fillColor)}
                        variants={progressBarFill}
                        custom={masteryPercent}
                      />
                    </div>
                  )}
                </div>

                {/* Practice button */}
                <div className="sm:shrink-0 w-full sm:w-auto flex flex-col gap-2">
                  {assignedFocus && (
                    <Button
                      size="lg"
                      data-testid="assigned-focus-practice"
                      onClick={() => router.push(focusPracticeHref(language, studentLesson.lessonId, assignedFocus))}
                      className={cn(
                        'w-full sm:w-auto font-neo-display',
                        'bg-neo-yellow hover:bg-neo-yellow/90 text-neo-black',
                        'border-neo border-neo-black shadow-hard hover:shadow-hard-lg'
                      )}
                    >
                      <Crosshair className="w-5 h-5 me-2" aria-hidden="true" />
                      {t('education.vocabFocus.startAssigned', { focus: t(`education.vocabFocus.focus.${assignedFocus}`) })}
                    </Button>
                  )}
                  <QuickPracticeButton
                    lessonId={studentLesson.lessonId}
                    onPractice={(mode?: PracticeType) => {
                      // No mode means "show me what this lesson can do": the
                      // lesson page opens on its practice picker instead of
                      // auto-starting a drill.
                      const base = `/${language}/student/lessons/${studentLesson.lessonId}`;
                      router.push(mode ? `${base}?mode=${mode}` : base);
                    }}
                    size="lg"
                    className="w-full sm:w-auto"
                  />
                </div>
              </div>
            </div>
          </AdaptiveMotion.div>
        );
      })}
    </AdaptiveMotion.div>
  );
}
