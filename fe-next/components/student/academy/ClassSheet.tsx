'use client';

/**
 * The class standings, behind a sheet. Mounted ONLY while open: a closed sheet
 * that is merely translated off-screen would still be a scroll container on the
 * page.
 */

import { m } from 'framer-motion';
import { EyeOff, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import ClassroomLeaderboard from '@/components/education/ClassroomLeaderboard';
import { StudentAssignmentPlayCta } from '@/components/student/StudentAssignmentPlayCta';
import { ClassStrip } from './ClassStrip';
import { ClassSwitcher } from './ClassSwitcher';
import { useLeaderboardVisibility } from '@/hooks/useLeaderboardVisibility';
import { Loader } from '@/components/ui/Loader';
import type { NextOpenAssignment } from '@/components/student/nextOpenAssignment';

interface Props {
  classroomId: string;
  userId: string;
  className?: string | null;
  onClose: () => void;
  reducedMotion: boolean;
  /** Next unfinished homework; null/omitted hides the Play CTA. */
  nextOpenAssignment?: NextOpenAssignment | null;
  classrooms?: { id: string; name: string }[];
  onSelectClassroom?: (id: string) => void;
}

export function ClassSheet({ classroomId, userId, className, onClose, reducedMotion, nextOpenAssignment = null, classrooms = [], onSelectClassroom }: Props) {
  const { t } = useLanguage();
  const visibility = useLeaderboardVisibility(classroomId);
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={t('student.dashboard.leaderboard', 'Leaderboard')}>
      <button type="button" aria-label={t('common.close', 'Close')} onClick={onClose} className="absolute inset-0 bg-neo-black/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-black" />
      <m.div
        initial={reducedMotion ? false : { y: 40, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className="relative m-3 flex max-h-[80dvh] w-full max-w-lg flex-col rounded-neo border-3 border-neo-cream bg-neo-navy shadow-hard-lg"
      >
        <div className="flex items-center justify-between gap-3 border-b-3 border-neo-black bg-neo-lime px-4 py-3">
          <div className="min-w-0">
            <h2 className="line-clamp-2 font-neo-display text-lg font-black uppercase text-neo-black">
              {t('student.dashboard.leaderboard', 'Leaderboard')}
            </h2>
            {className && <p className="line-clamp-2 font-neo-body text-xs font-bold text-neo-black/70">{className}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close', 'Close')}
            className="rounded-neo border-2 border-neo-black bg-neo-white p-1.5 text-neo-black shadow-hard-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-black"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {onSelectClassroom && <ClassSwitcher classrooms={classrooms} activeId={classroomId} onSelect={onSelectClassroom} />}
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <StudentAssignmentPlayCta next={nextOpenAssignment} />
          <ClassStrip classroomId={classroomId} reducedMotion={reducedMotion} />
          {visibility === null ? (
            <div data-testid="class-sheet-standings-loading" className="flex justify-center py-8">
              <Loader size="md" />
            </div>
          ) : visibility === 'hidden' ? (
            <p
              data-testid="class-sheet-standings-off"
              className="mt-3 flex items-start gap-2 rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light p-3 font-neo-body text-sm font-bold text-neo-cream"
            >
              <EyeOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {t('student.dashboard.leaderboardOff')}
            </p>
          ) : (
            <ClassroomLeaderboard classroomId={classroomId} currentUserId={userId} visibility={visibility} />
          )}
        </div>
      </m.div>
    </div>
  );
}
