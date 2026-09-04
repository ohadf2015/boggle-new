'use client';

/**
 * StudentHubLearnZone — Learn zone for student hub (Zone 3)
 *
 * Ordered by whose material it is. The teacher's lessons lead, preceded only by the review
 * badge — which is itself the teacher's words, the ones due today. Word of the Day and the
 * generic challenge panel follow: they are the app's content, not the class's, and they used
 * to sit above the lesson list and push it off the first screen.
 */

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStudentProgress } from '@/hooks/useStudentProgress';
import { useSpacedRepetition } from '@/hooks/useSpacedRepetition';
import { useClassroomRewardListener } from '@/hooks/useClassroomRewardListener';
import { ReviewDueBadge } from '@/components/education/ReviewDueBadge';
import { WordOfTheDay } from '@/components/education/animations/WordOfTheDay';
import { ChallengePanel } from '@/components/education/challenges/ChallengePanel';
import StudentLessonView from '@/components/student/StudentLessonView';
import ClassroomLeaderboard from '@/components/education/ClassroomLeaderboard';
import { pickWordOfTheDay } from '@/lib/education/wordOfTheDay';

interface StudentHubLearnZoneProps {
  userId: string;
  classroomId?: string;
}

export function StudentHubLearnZone({ userId, classroomId }: StudentHubLearnZoneProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  // F-24: Surface classroom game rewards as a celebration toast
  const { reward, clearReward } = useClassroomRewardListener(userId);
  useEffect(() => {
    if (!reward) return;
    const timer = setTimeout(() => clearReward(), 5000);
    return () => clearTimeout(timer);
  }, [reward, clearReward]);

  // Spaced repetition data
  const { lessons } = useStudentProgress();
  const firstLesson = lessons.find(l => l.lesson?.words?.length);
  const lessonId = firstLesson?.lessonId ?? '';
  const words = useMemo(
    () => (firstLesson?.lesson?.words ?? []).map((w: { word: string }) => w.word),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lessonId]
  );
  const { wordsForToday } = useSpacedRepetition(words, lessonId);

  // Deterministic per day + lesson. It used to be `Math.random()` cached in a ref, so it was
  // stable only within one mount: a student navigating away and back got a different "word
  // of the day" several times an afternoon, and no two classmates saw the same one.
  const wotdWord = useMemo(() => pickWordOfTheDay(words, lessonId), [words, lessonId]);

  return (
    <section aria-label={t('student.hub.learnZone')} className="space-y-4 relative">
      {/* F-24: Classroom game reward toast */}
      <AnimatePresence>
        {reward && (
          <m.div
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: -16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            // Inline, in the flow — NOT `fixed ... z-[80]`. A fixed banner across the top of
            // the viewport sits over whatever the student is reading and, at that z-index,
            // swallows taps on everything beneath it. It says "you earned XP"; that never
            // justifies covering the page.
            className="flex items-center gap-3 px-5 py-3 rounded-neo border-neo-thick border-black bg-neo-lime text-black font-neo-display font-black shadow-hard-lg"
          >
            <Sparkles className="w-6 h-6" aria-hidden="true" />
            <span className="text-lg uppercase tracking-wide">
              +{reward.xpEarned} XP
            </span>
            <button
              onClick={clearReward}
              className="ms-2 text-xs uppercase underline"
              aria-label={t('common.dismiss')}
            >
              ×
            </button>
          </m.div>
        )}
      </AnimatePresence>

      <h2 className="text-lg font-neo-display font-black text-neo-cyan mb-3 uppercase tracking-wide">
        {t('student.hub.learnZone')}
      </h2>

      {/* Review Due Badge */}
      {lessonId && wordsForToday.length > 0 && (
        <ReviewDueBadge
          count={wordsForToday.length}
          onStartReview={() => router.push(`/${language}/student/lessons/${lessonId}?mode=flashcard`)}
        />
      )}

      {/* Lessons */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      >
        <StudentLessonView />
      </m.div>

      {/* Word of the Day */}
      {wotdWord && (
        <WordOfTheDay word={wotdWord} />
      )}

      {/* Challenges */}
      <ChallengePanel playerId={userId} />

      {/* Collapsible Leaderboard */}
      {classroomId && (
        <div>
          <button
            onClick={() => setLeaderboardOpen(!leaderboardOpen)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-neo border-neo border-black bg-neo-navy-light text-neo-white font-neo-display font-bold shadow-hard-sm hover:bg-neo-navy transition-colors"
          >
            <span>{t('student.dashboard.leaderboard')}</span>
            {leaderboardOpen ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
          {leaderboardOpen && (
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="mt-2"
            >
              <ClassroomLeaderboard
                classroomId={classroomId}
                currentUserId={userId}
              />
            </m.div>
          )}
        </div>
      )}
    </section>
  );
}
