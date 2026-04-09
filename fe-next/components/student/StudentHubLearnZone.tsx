'use client';

/**
 * StudentHubLearnZone — Learn zone for student hub (Zone 3)
 *
 * ReviewDueBadge, WordOfTheDay, ChallengePanel, StudentLessonView,
 * and a collapsible ClassroomLeaderboard.
 */

import { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStudentProgress } from '@/hooks/useStudentProgress';
import { useSpacedRepetition } from '@/hooks/useSpacedRepetition';
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
    <section aria-label={t('student.hub.learnZone')} className="space-y-4">
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      >
        <StudentLessonView />
      </motion.div>

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
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="mt-2"
            >
              <ClassroomLeaderboard
                classroomId={classroomId}
                currentUserId={userId}
              />
            </motion.div>
          )}
        </div>
      )}
    </section>
  );
}
