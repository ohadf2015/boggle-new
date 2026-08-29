/**
 * StudentWelcomeSurface.tsx
 *
 * Welcome surface for students on first classroom arrival.
 * Surfaces immediate playable options (daily challenges) with celebratory design.
 * Designed for the guest-with-zero-history case as the MAIN case.
 *
 * Inspired by Blooket's game-mode merchandising + Kahoot's full-screen immersive energy.
 */

'use client';

import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface StudentWelcomeSurfaceProps {
  classroomId: string;
  userId: string;
  isNewJoin: boolean;
}

export function StudentWelcomeSurface({
  classroomId,
  userId,
  isNewJoin,
}: StudentWelcomeSurfaceProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const isRTL = language === 'he';

  if (!isNewJoin) {
    return null;
  }

  const handleDailyChallenge = () => {
    // Route to daily hub — all students can play daily challenges
    router.push(`/${language}/daily`);
  };

  return (
    <m.section
      data-surface-type="welcome"
      data-ready="true"
      className={cn(
        'rounded-neo border-3 border-black shadow-hard-lg overflow-hidden',
        'bg-gradient-to-br from-neo-cyan via-neo-purple to-neo-pink',
        'p-6 sm:p-8',
        isRTL && 'rtl'
      )}
      initial={{ opacity: 0, scale: 0.92, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22, duration: 0.6 }}
      aria-label={t('student.welcome.title')}
    >
      {/* Animated background accent */}
      <m.div
        className="absolute inset-0 opacity-10 pointer-events-none"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_50%)]" />
      </m.div>

      {/* Content container */}
      <div className="relative z-10 space-y-4">
        {/* Header */}
        <m.div
          className="flex items-center gap-3 mb-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <m.span
            className="text-4xl"
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
          >
            ✨
          </m.span>
          <h2 className="text-2xl sm:text-3xl font-neo-display font-black text-neo-white">
            {t('student.welcome.title')}
          </h2>
        </m.div>

        <p className="text-neo-white font-neo-body text-sm sm:text-base leading-relaxed">
          {t('student.welcome.subtitle')}
        </p>

        {/* CTA Button */}
        <m.button
          onClick={handleDailyChallenge}
          data-welcome-action="daily-challenge"
          className={cn(
            'w-full py-4 px-6 rounded-neo border-3 border-black shadow-hard-lg',
            'bg-neo-lime text-neo-black font-neo-display font-black text-lg',
            'hover:shadow-hard-sm hover:translate-y-0.5 active:translate-y-1',
            'transition-all duration-150 flex items-center justify-center gap-2'
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4, type: 'spring' }}
        >
          <Sparkles className="w-5 h-5" />
          {t('student.welcome.dailyChallenge')}
        </m.button>

        {/* Reward indicator */}
        <m.p
          className="text-center text-neo-white font-neo-body text-xs sm:text-sm font-bold"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          {t('student.welcome.rewards')}
        </m.p>
      </div>
    </m.section>
  );
}
