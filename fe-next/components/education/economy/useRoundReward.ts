'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocketEmit, useSocketEvent } from '@/utils/SocketContext';
import { CLASSROOM_ECONOMY_EVENTS as E, type ClassroomChestReveal } from '@/shared/constants/classroomEconomy';

const RETRY_MS = 2000;
const MAX_ASKS = 4;

/**
 * The round's chest for this student. Asks the server once the results screen
 * is up, and again if the server says the round is not settled yet. The reveal
 * is only ever the server's: a null reply is never turned into a local one.
 */
export function useRoundReward(gameCode: string | null, roundId: string | null) {
  const emit = useSocketEmit();
  const [reveal, setReveal] = useState<ClassroomChestReveal | null>(null);
  const [tick, setTick] = useState(0);
  const asks = useRef(0);

  const onReward = useCallback(
    (r: ClassroomChestReveal | null) => {
      if (r) {
        if (r.gameCode === gameCode && r.roundId === roundId) setReveal(r);
        return;
      }
      if (asks.current < MAX_ASKS) setTimeout(() => setTick((n) => n + 1), RETRY_MS);
    },
    [gameCode, roundId]
  );
  useSocketEvent<ClassroomChestReveal | null>(E.reward, onReward);

  useEffect(() => {
    if (!gameCode || !roundId || reveal || asks.current >= MAX_ASKS) return;
    asks.current += 1;
    emit(E.requestReward, { gameCode, roundId });
  }, [gameCode, roundId, reveal, tick, emit]);

  return reveal;
}
