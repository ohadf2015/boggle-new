/**
 * Follow the class when the teacher opens a new game for it.
 *
 * The server sends `classroomGameMoved { fromCode, toCode }` in two moments
 * (backend/handlers/classroomGameMove.ts): to the old room as the teacher opens
 * the new game, and to a student who re-joins the old code afterwards. Either
 * way the student re-joins `toCode` in place, so they stay in the lesson
 * instead of landing on "your class game ended" and re-typing a code. If the
 * teacher's new room is not open yet, the ordinary CLASSROOM_NOT_OPEN wait
 * holds them on "waiting for your teacher".
 */

'use client';

import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';

export interface ClassroomGameMovedEvent {
  fromCode?: string;
  toCode?: string;
  reason?: string;
}

const CODE_RE = /^[A-Z0-9]{4,8}$/;

function norm(code: unknown): string {
  return typeof code === 'string' ? code.trim().toUpperCase() : '';
}

/**
 * Should this client follow the move? Never the teacher (they are opening the
 * new room themselves), never to a malformed or identical code, and only a move
 * out of the code this client is in or trying to join — a stray event for
 * another room must not pull a student out of theirs.
 */
export function shouldFollowClassroomMove(
  data: ClassroomGameMovedEvent | null | undefined,
  ctx: { currentCode: string | null | undefined; isHost: boolean }
): string | null {
  if (ctx.isHost) return null;
  const toCode = norm(data?.toCode);
  const fromCode = norm(data?.fromCode);
  if (!CODE_RE.test(toCode) || toCode === fromCode) return null;
  const current = norm(ctx.currentCode);
  if (current && fromCode && current !== fromCode) return null;
  return toCode;
}

interface Options {
  socket: Socket | null;
  /** The code this client is in, or is joining. */
  currentCode: string | null | undefined;
  isHost: boolean;
  follow: (toCode: string, data: ClassroomGameMovedEvent) => void;
}

export function useClassroomGameMove({ socket, currentCode, isHost, follow }: Options): void {
  const ctxRef = useRef({ currentCode, isHost, follow });
  useEffect(() => {
    ctxRef.current = { currentCode, isHost, follow };
  });

  useEffect(() => {
    if (!socket) return;
    const onMoved = (data: ClassroomGameMovedEvent) => {
      const { currentCode: code, isHost: host, follow: go } = ctxRef.current;
      const toCode = shouldFollowClassroomMove(data, { currentCode: code, isHost: host });
      if (toCode) go(toCode, data);
    };
    socket.on('classroomGameMoved', onMoved);
    return () => {
      socket.off('classroomGameMoved', onMoved);
    };
  }, [socket]);
}

export default useClassroomGameMove;
