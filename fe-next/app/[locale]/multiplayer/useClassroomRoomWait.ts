/**
 * Hold an early classroom joiner on "waiting for your teacher" until the room
 * opens — never bounce them.
 *
 * The teacher's code is on the wall before the socket room exists (the room is
 * created when she taps START GAME). The server answers such a `join` with
 * CLASSROOM_NOT_OPEN and parks the socket; when the room is created it pushes
 * `classroomRoomOpened` and we re-join at once. A slow re-ask covers the push
 * not reaching this socket (another instance, a reconnect in between). Each
 * re-ask that still finds no room answers CLASSROOM_NOT_OPEN again, which calls
 * `hold` again — so the wait lives exactly as long as the server says it should.
 *
 * Capped: a teacher who never starts must not leave a child on a spinner
 * forever with nothing said (recurring pitfall class 4) — `onGiveUp` fires.
 */

'use client';

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { Socket } from 'socket.io-client';

/** Fallback re-ask. The push is the fast path; this only covers a lost push. */
export const ROOM_WAIT_RETRY_MS = 8_000;
/** Longest a child waits on the teacher before being told what happened. */
export const ROOM_WAIT_MAX_MS = 20 * 60_000;

interface Options {
  socketRef: MutableRefObject<Socket | null>;
  /** True once the student is seated — the wait is over. */
  isActive: boolean;
  /** Re-emit the join for this code. */
  rejoin: (code: string) => void;
  /** The cap ran out. */
  onGiveUp: (code: string) => void;
}

export function useClassroomRoomWait({ socketRef, isActive, rejoin, onGiveUp }: Options) {
  const [waitingCode, setWaitingCode] = useState<string | null>(null);
  // Bumped by every `hold`, so each fresh CLASSROOM_NOT_OPEN re-arms the timer.
  const [attempt, setAttempt] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const rejoinRef = useRef(rejoin);
  const giveUpRef = useRef(onGiveUp);
  useEffect(() => {
    rejoinRef.current = rejoin;
    giveUpRef.current = onGiveUp;
  });

  const release = useCallback(() => {
    startedAtRef.current = null;
    setWaitingCode(null);
  }, []);

  const hold = useCallback((code: string) => {
    const now = Date.now();
    if (startedAtRef.current === null) startedAtRef.current = now;
    if (now - startedAtRef.current > ROOM_WAIT_MAX_MS) {
      release();
      giveUpRef.current(code);
      return;
    }
    setWaitingCode(code);
    setAttempt((a) => a + 1);
  }, [release]);

  // Seated — nothing left to wait for.
  useEffect(() => {
    if (isActive && waitingCode) release();
  }, [isActive, waitingCode, release]);

  useEffect(() => {
    if (!waitingCode || isActive) return;
    const socket = socketRef.current;
    let fired = false;
    const go = () => {
      if (fired) return;
      fired = true;
      rejoinRef.current(waitingCode);
    };
    const timer = setTimeout(go, ROOM_WAIT_RETRY_MS);
    const onOpened = (data?: { gameCode?: string }) => {
      if (data?.gameCode === waitingCode) go();
    };
    socket?.on('classroomRoomOpened', onOpened);
    return () => {
      clearTimeout(timer);
      socket?.off('classroomRoomOpened', onOpened);
    };
  }, [waitingCode, attempt, isActive, socketRef]);

  return { waitingCode, hold, release };
}

export default useClassroomRoomWait;
