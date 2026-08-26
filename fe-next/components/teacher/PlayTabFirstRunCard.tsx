'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { m } from 'framer-motion';
import CreateClassroomWizard from './CreateClassroomWizard';

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
 * Walks through Create class → Get code → Share with students, then routes
 * to the prepare tab so ClassroomManager can open the create dialog.
 */
export default function PlayTabFirstRunCard({ onCreateClassroom }: PlayTabFirstRunCardProps) {
  const { t } = useLanguage();

  return (
    <m.div
      data-testid="play-tab-first-run-card"
      variants={fadeSlide}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <p className="mb-4 text-center text-black font-neo-body font-black text-lg text-balance rounded-neo border-3 border-black bg-neo-lime px-4 py-3 shadow-hard">
        {t('teacher.dashboard.createClassroomFirst')}
      </p>
      <CreateClassroomWizard
        onCreateClassroom={onCreateClassroom}
        createButtonTestId="play-tab-create-button"
      />
    </m.div>
  );
}
