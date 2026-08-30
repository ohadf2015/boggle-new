'use client';

import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStudentProgress } from '@/hooks/useStudentProgress';

interface QuickStartCardProps {
  classroomId: string;
  userId: string;
}

const cardSpring = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 25,
};

/**
 * QuickStartCard - Prominent call-to-action for students in their first classroom experience.
 * Shows when:
 * - Student has just joined a classroom
 * - No teacher-started games are active
 * - Not enough students for a duel
 *
 * Directs to lesson practice, the most accessible playable content.
 */
export function QuickStartCard({ classroomId, userId }: QuickStartCardProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { lessons } = useStudentProgress();

  // Get the first available lesson to start practice
  const firstLesson = lessons.find(l => l.lesson?.words?.length);

  const handleStart = () => {
    if (firstLesson?.lessonId) {
      // Start practice mode on the first available lesson
      router.push(`/${language}/student/lessons/${firstLesson.lessonId}?mode=practice`);
    } else {
      // If no lessons yet, go to lessons view to see empty state or browse
      router.push(`/${language}/student/lessons`);
    }
  };

  return (
    <m.button
      onClick={handleStart}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="relative rounded-neo border-neo border-black shadow-hard-lg bg-neo-cyan p-4 sm:p-6 text-left w-full"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-neo border-3 border-black bg-black flex items-center justify-center shadow-hard-sm">
          <BookOpen className="w-7 h-7 text-neo-cyan" />
        </div>
        <h3 className="text-xl font-neo-display font-black text-black text-center">
          {t('student.quickStart.title')}
        </h3>
        <p className="text-sm font-neo-body font-bold text-black/60 text-center">
          {t('student.quickStart.subtitle')}
        </p>
        <div className="mt-2 px-4 py-2 bg-black text-neo-cyan font-neo-display font-bold text-sm rounded-neo">
          {t('student.quickStart.action')}
        </div>
      </div>
    </m.button>
  );
}
