'use client';

/**
 * Carry the teacher's launch-time mode into the host's start intent.
 *
 * A classroom teacher always hosts from the projector lobby (hostPlaying is
 * forced false when lesson data is present), and that lobby has no mode
 * picker. The host `startGame` emit reads `hostSelectedGameMode` — which the
 * TV lobby seeded from the store default, 'random'. The server then rolled a
 * mode, so a teacher who picked CLASSIC watched her class play Word Hunt.
 *
 * Seeded ONCE per room code: after the first seed, the store is the live truth
 * (an in-place switch writes it via useClassroomModeSwitch), and the launch-time
 * mode this hook receives would be stale on a lobby remount between rounds.
 */
import { useEffect } from 'react';
import { useGameActions } from '@/hooks/gameState';
import type { GameMode } from '@/shared/types/game';
import type { ClassroomGameMode } from '@/shared/types/vocabQuiz';

const BOARD_MODES: readonly string[] = ['classic', 'word-hunt', 'blast', 'wheel-rush'];

/**
 * The board mode a classroom room plays, or null. The quiz is null on purpose:
 * the server starts it from the room record whatever the emit says.
 */
export function classroomBoardMode(mode: ClassroomGameMode | string | null | undefined): GameMode | null {
  return mode && BOARD_MODES.includes(mode) ? (mode as GameMode) : null;
}

const seededRooms = new Set<string>();

/** Test hook — module state outlives a render. */
export function __resetClassroomModeSeeds(): void {
  seededRooms.clear();
}

export function useClassroomModeSeed({
  isClassroomMode,
  gameCode,
  classroomGameMode,
}: {
  isClassroomMode: boolean;
  gameCode: string;
  classroomGameMode?: ClassroomGameMode | null;
}): void {
  const { setGameMode, setHostSelectedGameMode } = useGameActions();
  const mode = isClassroomMode ? classroomBoardMode(classroomGameMode) : null;

  useEffect(() => {
    if (!mode || !gameCode || seededRooms.has(gameCode)) return;
    seededRooms.add(gameCode);
    setGameMode(mode);
    setHostSelectedGameMode(mode);
  }, [mode, gameCode, setGameMode, setHostSelectedGameMode]);
}
