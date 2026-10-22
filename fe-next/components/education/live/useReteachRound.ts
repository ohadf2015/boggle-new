'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { ClassroomSummary } from '@/shared/types/classroom';
import { reteachList } from './eduReteachModel';

export const RETEACH_ACK_TIMEOUT_MS = 6_000;

/**
 * `failed`: the server refused, so the room is unchanged. `unconfirmed`: no answer in time, so the room may be narrowed.
 * `ready`: the room was narrowed after the wait ran out, so the next Play again uses the reteach words.
 * `restoring` / `restoreFailed`: the teacher asked for the full lesson back before that round ran.
 */
export type ReteachStatus = 'idle' | 'pending' | 'failed' | 'unconfirmed' | 'ready' | 'restoring' | 'restoreFailed';

interface Input {
  gameCode: string | null;
  socket: Pick<Socket, 'emit' | 'on' | 'off'> | null;
  /** Runs once the server has narrowed the room, never before. */
  onApplied: () => void;
}

type Request = 'replay' | 'restore' | null;

const sameCode = (a: string | null | undefined, b: string | null | undefined) => !!a && !!b && a.toUpperCase() === b.toUpperCase();

/** The server deals and grades from the room record, so the round starts only after its ack. */
export function useReteachRound({ gameCode, socket, onApplied }: Input) {
  const [status, setStatus] = useState<ReteachStatus>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requested = useRef<Request>(null);
  const latestOnApplied = useRef(onApplied);
  latestOnApplied.current = onApplied;

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  useEffect(() => {
    if (!socket) return;
    const answers = (kind: Request, data?: { gameCode?: string }, strict = true) =>
      requested.current === kind && (strict ? sameCode(data?.gameCode, gameCode) : !data?.gameCode || sameCode(data.gameCode, gameCode));
    const settle = () => {
      requested.current = null;
      const inTime = timer.current !== null;
      clear();
      return inTime;
    };
    const onAck = (data?: { gameCode?: string }) => {
      if (!answers('replay', data)) return;
      if (settle()) {
        setStatus('idle');
        latestOnApplied.current();
      } else {
        setStatus('ready');
      }
    };
    const onRefused = (data?: { gameCode?: string }) => {
      if (!answers('replay', data, false)) return;
      settle();
      setStatus('failed');
    };
    const onRestored = (data?: { gameCode?: string }) => {
      if (!answers('restore', data)) return;
      settle();
      setStatus('idle');
    };
    const onRestoreRefused = (data?: { gameCode?: string }) => {
      if (!answers('restore', data, false)) return;
      settle();
      setStatus('restoreFailed');
    };
    socket.on('classroomReteachApplied', onAck);
    socket.on('classroomReteachRefused', onRefused);
    socket.on('classroomFullLessonRestored', onRestored);
    socket.on('classroomFullLessonRefused', onRestoreRefused);
    return () => {
      socket.off('classroomReteachApplied', onAck);
      socket.off('classroomReteachRefused', onRefused);
      socket.off('classroomFullLessonRestored', onRestored);
      socket.off('classroomFullLessonRefused', onRestoreRefused);
    };
  }, [socket, gameCode]);

  useEffect(() => clear, []);

  const send = useCallback(
    (kind: Exclude<Request, null>, event: string, payload: Record<string, unknown>, failed: ReteachStatus, unanswered: ReteachStatus) => {
      if (!socket || !gameCode) {
        setStatus(failed);
        return;
      }
      clear();
      requested.current = kind;
      setStatus(kind === 'replay' ? 'pending' : 'restoring');
      socket.emit(event, { gameCode, ...payload });
      timer.current = setTimeout(() => {
        timer.current = null;
        setStatus(unanswered);
      }, RETEACH_ACK_TIMEOUT_MS);
    },
    [socket, gameCode]
  );

  const replay = useCallback(
    (words: string[]) => {
      if (words.length === 0) {
        setStatus('failed');
        return;
      }
      send('replay', 'classroomReteachWords', { words }, 'failed', 'unconfirmed');
    },
    [send]
  );

  const restoreFull = useCallback(() => send('restore', 'classroomRestoreFullLesson', {}, 'restoreFailed', 'restoreFailed'), [send]);

  return { status, replay, restoreFull };
}

interface ReplayInput {
  summary: ClassroomSummary | null | undefined;
  gameCode: string | null | undefined;
  socket: Input['socket'];
  /** The surface's own Play again. Absent: no replay is offered, since nothing could start its round. */
  onRematch?: () => void;
}

export function useReplayMissedWords({ summary, gameCode, socket, onRematch }: ReplayInput) {
  const missed = onRematch && summary ? reteachList(summary) : [];
  const round = useReteachRound({ gameCode: gameCode ?? null, socket, onApplied: () => onRematch?.() });
  const start = missed.length > 0 ? () => round.replay(missed.map((w) => w.word)) : undefined;
  return { missed, start, ...round };
}

