'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { LiveClassroomGameInfo } from '@/lib/education/liveClassroomGameInfo';
import { VOCAB_QUIZ_EVENTS, VOCAB_QUIZ_MODE, type ClassroomGameMode } from '@/shared/types/vocabQuiz';
import { MODE_TRANSLATION_KEY } from '@/components/education/classroomModeLabels';

function asClassroomMode(value: unknown): ClassroomGameMode | null {
  return typeof value === 'string' && value in MODE_TRANSLATION_KEY ? (value as ClassroomGameMode) : null;
}

/**
 * The live-game record is fetched once per code, but a teacher can change the
 * game inside the same room, so the mode follows the room's own traffic.
 */
export function useFollowedClassroomGame(
  socket: Socket | null,
  gameCode: string | undefined,
  record: LiveClassroomGameInfo | null
): LiveClassroomGameInfo | null {
  const [followed, setFollowed] = useState<{ code: string; mode: ClassroomGameMode } | null>(null);

  useEffect(() => {
    if (!socket || !gameCode) return;
    const follow = (mode: ClassroomGameMode | null) => {
      if (mode) setFollowed({ code: gameCode, mode });
    };

    const onModeChanged = (data?: unknown) => {
      const payload = data as { gameCode?: string; gameMode?: unknown } | undefined;
      if (payload?.gameCode && payload.gameCode !== gameCode) return;
      follow(asClassroomMode(payload?.gameMode));
    };
    // A quiz rides a board shell whose `gameMode` is a placeholder; its marker wins.
    const onStart = (data?: unknown) => {
      const payload = data as { gameMode?: unknown; classroomMode?: unknown } | undefined;
      follow(asClassroomMode(payload?.classroomMode) ?? asClassroomMode(payload?.gameMode));
    };
    // Not `state`: it also answers for a quiz that already ended in this room.
    const onQuizTraffic = () => follow(VOCAB_QUIZ_MODE);

    socket.on('classroomGameModeChanged', onModeChanged);
    socket.on('startGame', onStart);
    socket.on(VOCAB_QUIZ_EVENTS.question, onQuizTraffic);
    return () => {
      socket.off('classroomGameModeChanged', onModeChanged);
      socket.off('startGame', onStart);
      socket.off(VOCAB_QUIZ_EVENTS.question, onQuizTraffic);
    };
  }, [socket, gameCode]);

  const mode = followed && followed.code === gameCode ? followed.mode : null;
  return useMemo(
    () => (record && mode && mode !== record.gameMode ? { ...record, gameMode: mode } : record),
    [record, mode]
  );
}

export default useFollowedClassroomGame;
