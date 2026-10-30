import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { GameModeOption } from '@/components/GameModeSelector';
import type { DifficultyLevel } from '@/shared/types/game';

export const LOBBY_SETTINGS_DEBOUNCE_MS = 250;

interface Params {
  socket: Pick<Socket, 'on' | 'off' | 'emit'> | null;
  gameCode: string;
  /** Lobby only: the server ignores changes once a round runs. */
  enabled: boolean;
  mode: GameModeOption;
  /** Minutes, as the host's settings hold it. */
  timerValue: number;
  difficulty: DifficultyLevel;
  minWordLength: number;
}

/** Host: tell joiners the lobby pick (mode, length, board, min word). */
export function useBroadcastLobbySettings({ socket, gameCode, enabled, mode, timerValue, difficulty, minWordLength }: Params): void {
  const [connectTick, setConnectTick] = useState(0);

  useEffect(() => {
    if (!socket) return;
    const onConnect = () => setConnectTick((n) => n + 1);
    socket.on('connect', onConnect);
    return () => { socket.off('connect', onConnect); };
  }, [socket]);

  useEffect(() => {
    if (!socket || !enabled || !gameCode) return;
    const timer = setTimeout(() => {
      socket.emit('updateLobbySettings', {
        gameCode,
        mode,
        timerSeconds: Math.round(timerValue * 60),
        difficulty,
        minWordLength,
      });
    }, LOBBY_SETTINGS_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [socket, enabled, gameCode, mode, timerValue, difficulty, minWordLength, connectTick]);
}
