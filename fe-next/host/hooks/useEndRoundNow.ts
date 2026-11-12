import { useCallback } from 'react';
import type { Socket } from 'socket.io-client';

/** Same event as the teacher's live "End round" control: the server ends the round through the timer-end path. */
export function useEndRoundNow(socket: Socket | null | undefined): () => void {
  return useCallback(() => {
    socket?.emit('endRoundNow');
  }, [socket]);
}
