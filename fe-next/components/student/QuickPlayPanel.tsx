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
import { motion } from 'framer-motion';
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Quick Practice Button */}
      <motion.button
        onClick={handleQuickPractice}
        disabled={!hasLessons || isNavigating}
        whileHover={hasLessons ? { scale: 1.02, rotate: -1, translateY: -2 } : undefined}
        whileTap={hasLessons ? { scale: 0.97, translateY: 2 } : undefined}
        className="relative p-6 rounded-neo border-3 border-black bg-neo-cyan shadow-hard disabled:opacity-50 disabled:cursor-not-allowed transition-all flex flex-col items-center gap-3"
      >
        <div className="w-14 h-14 rounded-neo border-2 border-black bg-white/30 flex items-center justify-center shadow-hard-sm">
          {isNavigating ? (
            <Loader2 className="w-8 h-8 text-black animate-spin" />
          ) : (
            <Zap className="w-8 h-8 text-black" />
          )}
        </div>
        <div className="text-center">
          <p className="text-xl font-neo-display font-black text-black">
            {t('student.dashboard.quickPractice')}
          </p>
          <p className="text-sm font-neo-body font-bold text-black/70">
            {t('student.dashboard.randomLesson')}
          </p>
        </div>
      </motion.button>

      {/* Quick Duel Button */}
      <motion.button
        onClick={handleQuickDuel}
        whileHover={{ scale: 1.02, rotate: 1, translateY: -2 }}
        whileTap={{ scale: 0.97, translateY: 2 }}
        className="relative p-6 rounded-neo border-3 border-black bg-neo-pink shadow-hard transition-all flex flex-col items-center gap-3"
      >
        <div className="w-14 h-14 rounded-neo border-2 border-black bg-white/30 flex items-center justify-center shadow-hard-sm">
          <Swords className="w-8 h-8 text-black" />
        </div>
        <div className="text-center">
          <p className="text-xl font-neo-display font-black text-black">
            {t('student.dashboard.quickDuel')}
          </p>
          <p className="text-sm font-neo-body font-bold text-black/70">
            {t('student.dashboard.challengeClassmate')}
          </p>
        </div>
      </motion.button>
    </div>
  );
}
