'use client';

import type { Socket } from 'socket.io-client';
import { useClassroomModeSwitch } from '@/components/education/lobby/useClassroomModeSwitch';
import { CLASSROOM_GAME_MODES, VOCAB_QUIZ_MODE } from '@/shared/types/vocabQuiz';
import { launchOf, type ClassroomCatalogueId } from '@/lib/education/classroomCatalogueId';
import type { GameModeOption } from '@/components/GameModeSelector';
import { classroomRoundModeMeta } from '../round/roundModes';
import type { NextModeOption } from './MpNextModeCard';

type TFn = (key: string, params?: Record<string, string | number>) => string;

/** Wordcraft and crossword launch from the lobby's own flow, not from a results restart. */
const FROM_RESULTS = CLASSROOM_GAME_MODES.filter((id) => id !== 'wordcraft' && id !== 'crossword');

export const CLASSROOM_NEXT_OPTIONS: NextModeOption[] = FROM_RESULTS.map((id) => {
  const m = classroomRoundModeMeta(id);
  return { id, color: m.color, icon: m.icon, labelKey: m.nameKey };
});

interface Options {
  enabled: boolean;
  socket: Socket | null;
  gameCode: string;
  current: ClassroomCatalogueId;
  t: TFn;
  /** A board mode rides the teacher's next `startGame`; the quiz is decided by the server. */
  onBoardMode: (mode: GameModeOption) => void;
}

/** The teacher's between-rounds pick goes through the classroom switch, so the server record, the students' "next up" and the next start agree. */
export function useTeacherNextMode({ enabled, socket, gameCode, current, t, onBoardMode }: Options) {
  const { liveMode, pendingMode, switchTo } = useClassroomModeSwitch({
    gameCode,
    currentMode: current,
    socket: enabled ? socket : null,
    t,
    onApplied: (id) => {
      const { gameMode } = launchOf(id);
      if (gameMode !== VOCAB_QUIZ_MODE) onBoardMode(gameMode as GameModeOption);
    },
  });
  return { mode: pendingMode ?? liveMode, pick: (id: string) => switchTo(id as ClassroomCatalogueId) };
}
