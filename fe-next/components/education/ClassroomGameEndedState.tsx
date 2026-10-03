'use client';

import Link from 'next/link';
import { RotateCcw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStudentClassroom } from '@/hooks/useStudentClassroom';

interface ClassroomGameEndedStateProps {
  /** The room the student tried to reach; empty when unknown. */
  roomCode: string;
  message: string;
  hubHref: string;
  onRetry: (roomCode: string) => void;
}

const PRIMARY =
  'flex min-h-12 w-full items-center justify-center rounded-neo border-3 border-black bg-neo-black px-6 py-3 font-neo-display font-black text-neo-lime shadow-hard-sm transition-all hover:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px]';

/** Shown to a classroom student whose room is gone: what happened, a way on, and a quiet retry. */
export function ClassroomGameEndedState({ roomCode, message, hubHref, onRetry }: ClassroomGameEndedStateProps) {
  const { t, language } = useLanguage();
  const { classroomId, isLoading } = useStudentClassroom();

  return (
    <div
      role="alertdialog"
      aria-labelledby="classroom-game-ended-title"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-neo-navy px-4"
    >
      <div className="w-full max-w-sm rounded-neo border-3 border-black bg-neo-lime p-6 text-neo-black shadow-hard">
        <h1 id="classroom-game-ended-title" className="mb-2 font-neo-display text-2xl font-black">
          {t('education.student.gameEnded.title')}
        </h1>
        <p className="mb-5 font-neo-body text-neo-black/80">{message}</p>
        <div className="flex flex-col gap-3">
          {!isLoading && classroomId && (
            <Link data-testid="ended-primary" href={hubHref} className={PRIMARY}>
              {t('education.student.gameEnded.toClass')}
            </Link>
          )}
          {!isLoading && !classroomId && (
            <Link data-testid="ended-primary" href={`/${language}/join`} className={PRIMARY}>
              {t('education.student.gameEnded.newCode')}
            </Link>
          )}
          {/* Kept for a room that dropped on a restart and is re-hosted under the same code; quiet, because after a teacher ends the class it can only fail. */}
          {roomCode && (
            <button
              type="button"
              onClick={() => onRetry(roomCode)}
              className="mx-auto inline-flex min-h-11 items-center justify-center gap-1.5 rounded-neo px-3 font-neo-display text-sm font-black text-neo-black underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-black"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {t('education.student.gameEnded.retry')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ClassroomGameEndedState;
