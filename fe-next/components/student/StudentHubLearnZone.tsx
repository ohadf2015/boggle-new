'use client';

/**
 * StudentHubLearnZone — Learn zone for student hub (Zone 3)
 *
 * ReviewDueBadge, WordOfTheDay, ChallengePanel, StudentLessonView,
 * and a collapsible ClassroomLeaderboard.
 */

import { useState, useMemo, useRef, useEffect } from 'react';
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

  // Stable random WOTD — pick once per mount
  const wotdIndexRef = useRef<number | null>(null);
  const wotdWord = useMemo(() => {
    if (words.length === 0) return null;
    if (wotdIndexRef.current === null) {
      wotdIndexRef.current = Math.floor(Math.random() * words.length);
    }
    return words[wotdIndexRef.current % words.length];
  }, [words]);

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
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-3 px-5 py-3 rounded-neo border-neo-thick border-black bg-neo-lime text-black font-neo-display font-black shadow-hard-lg"
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

      {/* Word of the Day */}
      {wotdWord && (
        <WordOfTheDay word={wotdWord} />
      )}

      {/* Challenges */}
      <ChallengePanel playerId={userId} />

      {/* Lessons */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      >
        <StudentLessonView />
      </m.div>

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
