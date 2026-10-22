'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { stageReteachLessonData, type ReteachSource } from '@/lib/education/classroomGameHandoff';

export const RETEACH_ACK_TIMEOUT_MS = 6_000;

/** `ready`: the room was narrowed after the wait ran out, so the next Play again uses the reteach words. */
export type ReteachStatus = 'idle' | 'pending' | 'failed' | 'ready';

interface Input {
  gameCode: string | null;
  socket: Pick<Socket, 'emit' | 'on' | 'off'> | null;
  summary: Pick<ReteachSource, 'lessonIds' | 'lessonNames'>;
  /** Runs once the server has narrowed the room, never before. */
  onApplied: () => void;
}

const sameCode = (a: string | null | undefined, b: string | null | undefined) => !!a && !!b && a.toUpperCase() === b.toUpperCase();

/** The server deals and grades from the room record, so the round starts only after its ack. */
export function useReteachRound({ gameCode, socket, summary, onApplied }: Input) {
  const [status, setStatus] = useState<ReteachStatus>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requested = useRef(false);
  const latest = useRef({ summary, onApplied });
  latest.current = { summary, onApplied };

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  useEffect(() => {
    if (!socket) return;
    const onAck = (data?: { gameCode?: string; words?: string[] }) => {
      if (!requested.current || !sameCode(data?.gameCode, gameCode)) return;
      requested.current = false;
      const inTime = timer.current !== null;
      clear();
      const { summary: s, onApplied: start } = latest.current;
      stageReteachLessonData({ missedWords: data?.words ?? [], lessonIds: s.lessonIds, lessonNames: s.lessonNames });
      if (inTime) {
        setStatus('idle');
        start();
      } else {
        setStatus('ready');
      }
    };
    const onRefused = (data?: { gameCode?: string }) => {
      if (!requested.current || (data?.gameCode && !sameCode(data.gameCode, gameCode))) return;
      requested.current = false;
      clear();
      setStatus('failed');
    };
    socket.on('classroomReteachApplied', onAck);
    socket.on('classroomReteachRefused', onRefused);
    return () => {
      socket.off('classroomReteachApplied', onAck);
      socket.off('classroomReteachRefused', onRefused);
    };
  }, [socket, gameCode]);

  useEffect(() => clear, []);

  const replay = useCallback(
    (words: string[]) => {
      if (!socket || !gameCode || words.length === 0) {
        setStatus('failed');
        return;
      }
      clear();
      requested.current = true;
      setStatus('pending');
      socket.emit('classroomReteachWords', { gameCode, words });
      timer.current = setTimeout(() => {
        timer.current = null;
        setStatus('failed');
      }, RETEACH_ACK_TIMEOUT_MS);
    },
    [socket, gameCode]
  );

  return { status, replay };
}
