'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSocketEmit, useSocketEvent } from '@/utils/SocketContext';
import {
  CLASSROOM_ECONOMY_EVENTS as E,
  type ClassroomEconomyBoard,
  type ClassroomEconomySnapshot,
  type PowerUpId,
} from '@/shared/constants/classroomEconomy';

interface HintPayload {
  letter: string;
  length: number;
}

/** Server is the only writer. The hook mirrors whatever the server last sent. */
export function useClassroomEconomy(gameCode: string | null) {
  const emit = useSocketEmit();
  const [snapshot, setSnapshot] = useState<ClassroomEconomySnapshot | null>(null);
  const [board, setBoard] = useState<ClassroomEconomyBoard | null>(null);
  const [hint, setHint] = useState<HintPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onState = useCallback((s: ClassroomEconomySnapshot) => setSnapshot(s), []);
  const onBoard = useCallback((b: ClassroomEconomyBoard) => setBoard(b), []);
  const onHint = useCallback((h: HintPayload) => setHint(h), []);
  const onError = useCallback((e: { reason?: string }) => setError(e?.reason ?? 'error'), []);

  useSocketEvent<ClassroomEconomySnapshot>(E.state, onState);
  useSocketEvent<ClassroomEconomyBoard>(E.board, onBoard);
  useSocketEvent<HintPayload>(E.hint, onHint);
  useSocketEvent<{ reason?: string }>(E.error, onError);

  const requestState = useCallback(() => {
    if (gameCode) emit(E.requestState, { gameCode });
  }, [emit, gameCode]);

  useEffect(() => {
    requestState();
  }, [requestState]);

  const buy = useCallback(
    (powerUpId: PowerUpId) => {
      if (gameCode) emit(E.buyPowerUp, { gameCode, powerUpId });
    },
    [emit, gameCode]
  );

  const useHint = useCallback(() => {
    if (gameCode) emit(E.useHint, { gameCode });
  }, [emit, gameCode]);

  return { snapshot, board, hint, error, requestState, buy, useHint };
}
