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

const SECONDARY =
  'flex min-h-12 w-full items-center justify-center rounded-neo border-3 border-black bg-neo-white px-6 py-3 font-neo-display font-black text-neo-black shadow-hard-sm transition-all hover:shadow-hard active:translate-y-[2px] active:shadow-hard-pressed';

/** Shown to a classroom student whose room is gone: what happened, a retry, and a way on. */
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
          {roomCode && (
            <button
              type="button"
              onClick={() => onRetry(roomCode)}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-neo border-3 border-black bg-neo-black px-6 py-3 font-neo-display font-black text-neo-lime shadow-hard-sm transition-all hover:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px]"
            >
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
              {t('education.student.gameEnded.retry')}
            </button>
          )}
          {!isLoading && classroomId && (
            <Link href={hubHref} className={SECONDARY}>
              {t('education.student.gameEnded.toClass')}
            </Link>
          )}
          {!isLoading && !classroomId && (
            <Link href={`/${language}/join`} className={SECONDARY}>
              {t('education.student.gameEnded.newCode')}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default ClassroomGameEndedState;
