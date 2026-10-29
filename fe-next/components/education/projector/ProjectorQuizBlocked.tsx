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
    <div className="flex flex-col items-start gap-1">
      <p
        data-testid="quiz-blocked-reason"
        role="alert"
        className="font-neo-body font-bold leading-tight text-neo-pink text-[clamp(0.875rem,min(1cqw,1.9cqh),1.5rem)]"
      >
        {t(REASON_KEY)}
      </p>
      <button
        type="button"
        data-testid="quiz-blocked-play-classic"
        onClick={() => switchTo('classic')}
        disabled={!!pendingMode}
        className="inline-flex min-h-11 items-center rounded-sm font-neo-body font-black text-neo-lime underline decoration-2 underline-offset-4 transition-colors hover:text-neo-cream focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan disabled:opacity-50 text-[clamp(0.875rem,min(1cqw,1.9cqh),1.5rem)]"
      >
        {t('eg2Modes.playClassicInstead')}
      </button>
    </div>
  );
}
