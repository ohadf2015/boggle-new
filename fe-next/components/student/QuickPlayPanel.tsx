/**
 * QuickPlayPanel Component
 *
 * Two quick-action buttons for practice and duel modes.
 * Practice button picks a random lesson and navigates to it.
 * Duel button navigates to the duel lobby.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import { Zap, Swords, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStudentProgress } from '@/hooks/useStudentProgress';

interface QuickPlayPanelProps {
  classroomId: string;
  userId: string;
}

export default function QuickPlayPanel({ classroomId, userId }: QuickPlayPanelProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { lessons } = useStudentProgress();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleQuickPractice = () => {
    if (lessons.length === 0) return;

    // Pick a random lesson
    const randomIndex = Math.floor(Math.random() * lessons.length);
    const randomLesson = lessons[randomIndex];

    setIsNavigating(true);
    router.push(`/${language}/student/lessons/${randomLesson.lessonId}`);
  };

  const handleQuickDuel = () => {
    router.push(`/${language}/education/duels?classroomId=${classroomId}`);
  };

  const hasLessons = lessons.length > 0;

  return (
    <m.div
      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.12 } },
      }}
    >
      {/* Quick Practice Button */}
      <m.button
        variants={{
          hidden: { opacity: 0, y: 20, scale: 0.92 },
          visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 350, damping: 20 } },
        }}
        onClick={handleQuickPractice}
        disabled={!hasLessons || isNavigating}
        whileHover={hasLessons ? { scale: 1.04, rotate: -1.5, y: -4, boxShadow: '6px 6px 0px black' } : undefined}
        whileTap={hasLessons ? { scale: 0.96, y: 2, boxShadow: '2px 2px 0px black' } : undefined}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className="relative p-6 rounded-neo border-3 border-black bg-neo-cyan shadow-hard disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-3"
      >
        <m.div
          className="w-14 h-14 rounded-neo border-2 border-black bg-white/30 flex items-center justify-center shadow-hard-sm"
          animate={!isNavigating && hasLessons ? { rotate: [0, -8, 8, -4, 0] } : {}}
          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
        >
          {isNavigating ? (
            <Loader2 className="w-8 h-8 text-black animate-spin" />
          ) : (
            <Zap className="w-8 h-8 text-black" />
          )}
        </m.div>
        <div className="text-center">
          <p className="text-xl font-neo-display font-black text-black">
            {t('student.dashboard.quickPractice')}
          </p>
          <p className="text-sm font-neo-body font-bold text-black/70">
            {t('student.dashboard.randomLesson')}
          </p>
        </div>
      </m.button>

      {/* Quick Duel Button */}
      <m.button
        variants={{
          hidden: { opacity: 0, y: 20, scale: 0.92 },
          visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 350, damping: 20 } },
        }}
        onClick={handleQuickDuel}
        whileHover={{ scale: 1.04, rotate: 1.5, y: -4, boxShadow: '6px 6px 0px black' }}
        whileTap={{ scale: 0.96, y: 2, boxShadow: '2px 2px 0px black' }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className="relative p-6 rounded-neo border-3 border-black bg-neo-pink shadow-hard flex flex-col items-center gap-3"
      >
        <m.div
          className="w-14 h-14 rounded-neo border-2 border-black bg-white/30 flex items-center justify-center shadow-hard-sm"
          animate={{ rotate: [0, 6, -6, 3, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
        >
          <Swords className="w-8 h-8 text-black" />
        </m.div>
        <div className="text-center">
          <p className="text-xl font-neo-display font-black text-black">
            {t('student.dashboard.quickDuel')}
          </p>
          <p className="text-sm font-neo-body font-bold text-black/70">
            {t('student.dashboard.challengeClassmate')}
          </p>
        </div>
      </m.button>
    </m.div>
  );
}
