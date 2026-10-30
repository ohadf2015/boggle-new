'use client';

import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

interface SeatCapPayload {
  gameCode?: string;
  username?: string;
  cap?: number;
}

/** A student past the seat cap lands as a silent spectator; the teacher is the only one who can act on it. */
export function useClassroomSeatCapNotice(
  socket: Socket | null | undefined,
  isHost: boolean,
  gameCode: string | undefined,
  t: (key: string) => string
): void {
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    if (!socket || !isHost) return;
    const onSeatCap = (payload?: SeatCapPayload) => {
      if (!payload?.username || (gameCode && payload.gameCode !== gameCode)) return;
      const message = tRef.current('eduPolish.seatCapReached')
        .replace('{name}', payload.username)
        .replace('{cap}', String(payload.cap ?? ''));
      toast(message, { id: `seat-cap-${payload.username}` });
    };
    socket.on('classroomSeatCapReached', onSeatCap);
    return () => {
      socket.off('classroomSeatCapReached', onSeatCap);
    };
  }, [socket, isHost, gameCode]);
}

export default useClassroomSeatCapNotice;
