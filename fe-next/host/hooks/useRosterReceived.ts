import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';

/**
 * True once the server has sent this room's roster since the last (re)connect; until then the roster is unknown.
 * `seeded`: the view mounted with the join reply's player list, which always holds the host, so it is known.
 */
export function useRosterReceived(socket: Socket | null | undefined, gameCode: string, seeded = false): boolean {
  const [receivedFor, setReceivedFor] = useState<string | null>(seeded ? gameCode : null);

  useEffect(() => {
    if (!socket) return;
    const onRoster = () => setReceivedFor(gameCode);
    const onJoined = (data?: { gameCode?: string; users?: unknown }) => {
      if (data?.gameCode === gameCode && Array.isArray(data.users)) setReceivedFor(gameCode);
    };
    const onReconnect = () => setReceivedFor(null);
    socket.on('updateUsers', onRoster);
    socket.on('joined', onJoined);
    socket.on('connect', onReconnect);
    return () => {
      socket.off('updateUsers', onRoster);
      socket.off('joined', onJoined);
      socket.off('connect', onReconnect);
    };
  }, [socket, gameCode]);

  return receivedFor === gameCode;
}
