/**
 * Point a LIVE room at a different game, without minting a new code.
 *
 * The room's mode is not one value, and the pieces do not live together:
 *
 *  1. `lessonGameData` (the teacher's own sessionStorage) is what `HostView`,
 *     `HostPreGameView` and the projector lobby read to describe the room.
 *  2. `hostSelectedGameMode` (the game store) is what the host's `startGame`
 *     payload carries — the BOARD mode that actually begins.
 *  3. the Redis classroom record is what the SERVER reads: a live Vocab Quiz
 *     starts only when `settings.gameMode === 'vocab-quiz'` there, and the
 *     board path runs otherwise.
 *
 * Moving 1 and 2 alone would switch three modes and silently fail the fourth,
 * which is recurring pitfall class 3 in its purest form. One hook writes all
 * three so they cannot drift, and the server's answer is what commits them.
 *
 * PESSIMISTIC. Nothing on screen or in storage moves until the ack lands
 * (pitfall class 1): an optimistic repaint that a refusal then reverts would
 * flash the wrong game onto a projector in front of a class.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useGameActions } from '@/hooks/gameState';
import { VOCAB_QUIZ_MODE, type ClassroomGameMode } from '@/shared/types/vocabQuiz';
import type { GameMode } from '@/shared/types/game';

type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface ClassroomModeSwitchArgs {
  gameCode: string;
  /** What the room is playing before any switch — the caller's own precedence. */
  currentMode: ClassroomGameMode;
  socket: Socket | null;
  t: Translate;
  /** Called with the server-confirmed mode, so the surrounding surface can
   *  re-describe the room in the same tick. */
  onApplied?: (mode: ClassroomGameMode) => void;
}

/**
 * Keep the teacher's local copy of the room description honest.
 *
 * Best-effort: storage can be off, and the socket payload is the authority
 * anyway. A failure here must never stop the switch.
 */
function writeLocalGameMode(mode: ClassroomGameMode): void {
  try {
    const raw = sessionStorage.getItem('lessonGameData');
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    sessionStorage.setItem('lessonGameData', JSON.stringify({ ...parsed, gameMode: mode }));
  } catch {
    /* storage blocked — the room still switched */
  }
}

export function useClassroomModeSwitch({
  gameCode,
  currentMode,
  socket,
  t,
  onApplied,
}: ClassroomModeSwitchArgs) {
  const { setGameMode, setHostSelectedGameMode } = useGameActions();
  /** Set once the SERVER has confirmed; null means "whatever the caller says". */
  const [appliedMode, setAppliedMode] = useState<ClassroomGameMode | null>(null);
  const [pendingMode, setPendingMode] = useState<ClassroomGameMode | null>(null);
  const pendingRef = useRef<ClassroomGameMode | null>(null);
  pendingRef.current = pendingMode;
  // Held in a ref so a caller passing an inline arrow does not tear the socket
  // listeners down and rebuild them on every render.
  const appliedCbRef = useRef(onApplied);
  appliedCbRef.current = onApplied;

  useEffect(() => {
    if (!socket) return;

    const onChanged = (data?: unknown) => {
      const payload = data as { gameCode?: string; gameMode?: ClassroomGameMode } | undefined;
      // An ack for another room is not ours to paint.
      if (!payload?.gameMode || (payload.gameCode && payload.gameCode !== gameCode)) return;

      const mode = payload.gameMode;
      writeLocalGameMode(mode);
      // `vocab-quiz` is deliberately NOT a member of the board `GameMode`
      // union (see shared/types/vocabQuiz): it has no grid, no submitted words
      // and no rarity scoring, so writing it into the board store would drag
      // it into random rolls and every mode branch. The server owns that one.
      if (mode !== VOCAB_QUIZ_MODE) {
        setGameMode(mode as GameMode);
        setHostSelectedGameMode(mode as GameMode);
      }
      setAppliedMode(mode);
      setPendingMode(null);
      appliedCbRef.current?.(mode);
      toast.success(t('education.modePicker.switched', { mode: t(`teacher.classroom.gameModes.${modeKeySuffix(mode)}`) }));
    };

    const onError = (data?: unknown) => {
      if (!pendingRef.current) return; // not our failure
      const key = (data as { error?: string } | undefined)?.error;
      setPendingMode(null);
      toast.error(
        t(key === 'education.modePicker.switchMidRound' ? key : 'education.modePicker.switchFailed')
      );
    };

    socket.on('classroomGameModeChanged', onChanged);
    socket.on('classroomGameError', onError);
    return () => {
      socket.off('classroomGameModeChanged', onChanged);
      socket.off('classroomGameError', onError);
    };
  }, [socket, gameCode, setGameMode, setHostSelectedGameMode, t]);

  const switchTo = useCallback(
    (mode: ClassroomGameMode) => {
      if (mode === (appliedMode ?? currentMode)) return;
      if (!socket) {
        // Loud, not a no-op: a teacher who taps and sees nothing cannot tell a
        // dropped socket from a mode that simply looks the same.
        toast.error(t('education.modePicker.switchFailed'));
        return;
      }
      setPendingMode(mode);
      socket.emit('updateClassroomGameMode', { gameCode, gameMode: mode });
    },
    [appliedMode, currentMode, gameCode, socket, t]
  );

  return {
    /** What the room is playing right now, server-confirmed where we have it. */
    liveMode: appliedMode ?? currentMode,
    pendingMode,
    switchTo,
  };
}

/** `vocab-quiz` → `vocabQuiz`, matching the shipped `gameModes.*` key tails. */
function modeKeySuffix(mode: string): string {
  return mode.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

export default useClassroomModeSwitch;
