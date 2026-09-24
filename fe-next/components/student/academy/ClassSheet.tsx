'use client';

/**
 * The class standings, behind a sheet. Mounted ONLY while open: a closed sheet
 * that is merely translated off-screen would still be a scroll container on the
 * page.
 */

import { m } from 'framer-motion';
import { X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import ClassroomLeaderboard from '@/components/education/ClassroomLeaderboard';

interface Props {
  classroomId: string;
  userId: string;
  className?: string | null;
  onClose: () => void;
  reducedMotion: boolean;
}

export function ClassSheet({ classroomId, userId, className, onClose, reducedMotion }: Props) {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={t('student.dashboard.leaderboard', 'Leaderboard')}>
      <button type="button" aria-label={t('common.close', 'Close')} onClick={onClose} className="absolute inset-0 bg-neo-black/70" />
      <m.div
        initial={reducedMotion ? false : { y: 40, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className="relative m-3 flex max-h-[80dvh] w-full max-w-lg flex-col rounded-neo border-3 border-neo-cream bg-neo-navy shadow-hard-lg"
      >
        <div className="flex items-center justify-between gap-3 border-b-3 border-neo-black bg-neo-lime px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate font-neo-display text-lg font-black uppercase text-neo-black">
              {t('student.dashboard.leaderboard', 'Leaderboard')}
            </h2>
            {className && <p className="truncate font-neo-body text-xs font-bold text-neo-black/70">{className}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close', 'Close')}
            className="rounded-neo border-2 border-neo-black bg-neo-white p-1.5 text-neo-black shadow-hard-sm"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <ClassroomLeaderboard classroomId={classroomId} currentUserId={userId} />
        </div>
      </m.div>
    </div>
  );
}
