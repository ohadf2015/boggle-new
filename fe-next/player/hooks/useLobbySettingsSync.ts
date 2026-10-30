import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { parseLobbySettings, setLobbySettings } from '@/components/multiplayer/lobby/lobbySettingsStore';

type LobbySocket = Pick<Socket, 'on' | 'off' | 'emit'>;

/** Joiner: mirror the host's lobby pick; pull a snapshot on mount and after reconnect. */
export function useLobbySettingsSync(socket: LobbySocket | null, gameCode: string): void {
  useEffect(() => {
    if (!socket) return;
    const onSettings = (data: unknown) => {
      const parsed = parseLobbySettings(data);
      if (parsed && parsed.gameCode === gameCode) setLobbySettings(parsed);
    };
    const request = () => socket.emit('requestLobbySettings');
    socket.on('lobbySettings', onSettings);
    socket.on('connect', request);
    request();
    return () => {
      socket.off('lobbySettings', onSettings);
      socket.off('connect', request);
    };
  }, [socket, gameCode]);
}
