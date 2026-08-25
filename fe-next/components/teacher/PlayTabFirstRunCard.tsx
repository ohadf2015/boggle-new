'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { m } from 'framer-motion';
import { BarChart3, Plus } from 'lucide-react';

interface PlayTabFirstRunCardProps {
  onCreateClassroom: () => void;
}

const fadeSlide = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

/**
 * PlayTabFirstRunCard
 *
 * Shown on the play tab when a teacher has zero classrooms (loaded state).
 * Encourages classroom creation before starting games.
 *
 * Reuses the same pattern and text as the review tab's empty state.
 */
export default function PlayTabFirstRunCard({ onCreateClassroom }: PlayTabFirstRunCardProps) {
  const { t } = useLanguage();

  return (
    <m.div
      variants={fadeSlide}
      initial="initial"
      animate="animate"
      exit="exit"
      className="rounded-neo border-3 border-black bg-neo-cream shadow-hard px-6 py-10 text-center"
    >
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-neo border-2 border-black bg-neo-lime shadow-hard-sm">
        <BarChart3 className="h-8 w-8 text-black" />
      </div>
      <p className="text-black font-neo-body font-black text-lg text-balance">
        {t('teacher.dashboard.createClassroomFirst')}
      </p>
      <p className="mt-1 text-sm font-bold text-black/60 text-pretty">
        {t('teacher.dashboard.reviewEmptyHint')}
      </p>
      <button
        type="button"
        onClick={onCreateClassroom}
        className={cn(
          'mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-neo px-6 py-2.5',
          'border-3 border-black bg-neo-cyan font-neo-display font-black text-black shadow-hard',
          'hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-hard-pressed transition-all',
          'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-lime'
        )}
      >
        <Plus className="h-5 w-5" />
        {t('teacher.classroom.create')}
      </button>
    </m.div>
  );
}
