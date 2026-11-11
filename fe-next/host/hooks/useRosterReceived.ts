import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';

/** True once the server has sent this room's roster since the last (re)connect; until then the roster is unknown. */
export function useRosterReceived(socket: Socket | null | undefined, gameCode: string): boolean {
  const [receivedFor, setReceivedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;
    const onRoster = () => setReceivedFor(gameCode);
    const onReconnect = () => setReceivedFor(null);
    socket.on('updateUsers', onRoster);
    socket.on('connect', onReconnect);
    return () => {
      socket.off('updateUsers', onRoster);
      socket.off('connect', onReconnect);
    };
  }, [socket, gameCode]);

  return receivedFor === gameCode;
}
