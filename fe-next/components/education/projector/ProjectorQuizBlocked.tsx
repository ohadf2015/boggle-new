'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { VOCAB_QUIZ_EVENTS } from '@/shared/types/vocabQuiz';
import { useClassroomModeSwitch } from '@/components/education/lobby/useClassroomModeSwitch';
import { getSharedSocketIfExists } from '@/utils/SocketContext';
import type { ClassroomCatalogueId } from '@/lib/education/classroomCatalogueId';

type Translate = (key: string, params?: Record<string, string | number>) => string;

const REASON_KEY = 'eg2Modes.noQuizWords';

/** True once the server has refused this room's quiz start; the teacher is toasted the moment it happens. */
export function useQuizStartRefused(gameCode: string, t: Translate): [boolean, () => void] {
  const [refused, setRefused] = useState(false);

  useEffect(() => {
    const socket = getSharedSocketIfExists();
    if (!socket) return;
    const onRefused = (data?: { gameCode?: string }) => {
      if (data?.gameCode && data.gameCode !== gameCode) return;
      setRefused(true);
      toast.error(t(REASON_KEY));
    };
    socket.on(VOCAB_QUIZ_EVENTS.startRefused, onRefused);
    return () => {
      socket.off(VOCAB_QUIZ_EVENTS.startRefused, onRefused);
    };
  }, [gameCode, t]);

  return [refused, () => setRefused(false)];
}

interface ProjectorQuizBlockedProps {
  gameCode: string;
  currentMode: ClassroomCatalogueId;
  t: Translate;
  onApplied: (mode: ClassroomCatalogueId) => void;
}

export function ProjectorQuizBlocked({ gameCode, currentMode, t, onApplied }: ProjectorQuizBlockedProps) {
  const { pendingMode, switchTo } = useClassroomModeSwitch({
    gameCode,
    currentMode,
    socket: getSharedSocketIfExists(),
    t,
    onApplied,
  });

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        data-testid="quiz-blocked-play-classic"
        onClick={() => switchTo('classic')}
        disabled={!!pendingMode}
        className="inline-flex min-h-12 items-center justify-center rounded-neo border-[3px] border-neo-black bg-neo-lime px-4 py-2 font-neo-display font-black text-neo-black shadow-hard transition-transform active:translate-y-0.5 active:shadow-none focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan disabled:opacity-60 text-[clamp(1rem,min(1.4cqw,2.6cqh),2rem)]"
      >
        {t('eg2Modes.playClassicInstead')}
      </button>
      <p
        data-testid="quiz-blocked-reason"
        role="alert"
        className="font-neo-body leading-snug text-neo-cream/85 text-[clamp(0.8125rem,min(1cqw,1.9cqh),1.375rem)]"
      >
        {t(REASON_KEY)}
      </p>
    </div>
  );
}
