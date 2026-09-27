import { useState, useEffect, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';

interface PlayerComboData {
  level: number;
  lastWordTime: number;
}

interface PlayerFoundWordPayload {
  username: string;
  wordCount: number;
  score?: number;
  comboLevel?: number;
  word?: string;
}

interface UseTvPlayerCombosOptions {
  socket: Socket | null;
  enabled?: boolean;
  comboTimeout?: number; // ms before combo resets (default 2000)
}

interface UseTvPlayerCombosResult {
  playerCombos: Record<string, PlayerComboData>;
  getPlayerCombo: (username: string) => number;
  onComboChanged?: (username: string, oldLevel: number, newLevel: number) => void;
}

/**
 * useTvPlayerCombos - Tracks combo state for all players in TV broadcast mode
 * Listens to playerFoundWord events and maintains combo timeouts
 */
export function useTvPlayerCombos({
  socket,
  enabled = true,
  comboTimeout = 2000,
}: UseTvPlayerCombosOptions): UseTvPlayerCombosResult {
  const [playerCombos, setPlayerCombos] = useState<Record<string, PlayerComboData>>({});
  const timeoutRefs = useRef<Record<string, NodeJS.Timeout>>({});
  const onComboChangedRef = useRef<((username: string, oldLevel: number, newLevel: number) => void) | undefined>(undefined);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach(clearTimeout);
    };
  }, []);

  // Listen to playerFoundWord events
  useEffect(() => {
    if (!socket || !enabled) return;

    const handlePlayerFoundWord = (data: PlayerFoundWordPayload) => {
      const { username, comboLevel } = data;

      if (comboLevel === undefined) return;

      setPlayerCombos(prev => {
        const oldLevel = prev[username]?.level || 0;
        const newData: PlayerComboData = {
          level: comboLevel,
          lastWordTime: Date.now(),
        };

        // Notify of combo change
        if (onComboChangedRef.current && oldLevel !== comboLevel) {
          onComboChangedRef.current(username, oldLevel, comboLevel);
        }

        // Clear existing timeout for this player
        if (timeoutRefs.current[username]) {
          clearTimeout(timeoutRefs.current[username]);
        }

        // Set new timeout to reset combo
        timeoutRefs.current[username] = setTimeout(() => {
          setPlayerCombos(current => {
            const playerData = current[username];
            if (playerData && Date.now() - playerData.lastWordTime >= comboTimeout) {
              // Combo timed out
              const { [username]: _, ...rest } = current;
              return rest;
            }
            return current;
          });
        }, comboTimeout + 100); // Small buffer

        return {
          ...prev,
          [username]: newData,
        };
      });
    };

    // playerFoundWord is coalesced server-side into playerFoundWordBatch.
    const handleBatch = (data: { words?: PlayerFoundWordPayload[] }) => {
      data.words?.forEach((w) => handlePlayerFoundWord(w));
    };
    socket.on('playerFoundWordBatch', handleBatch);

    return () => {
      socket.off('playerFoundWordBatch', handleBatch);
    };
  }, [socket, enabled, comboTimeout]);

  // Reset combos on game reset
  useEffect(() => {
    if (!socket || !enabled) return;

    const handleResetGame = () => {
      setPlayerCombos({});
      Object.values(timeoutRefs.current).forEach(clearTimeout);
      timeoutRefs.current = {};
    };

    socket.on('resetGame', handleResetGame);
    socket.on('startGame', handleResetGame);

    return () => {
      socket.off('resetGame', handleResetGame);
      socket.off('startGame', handleResetGame);
    };
  }, [socket, enabled]);

  const getPlayerCombo = useCallback((username: string): number => {
    return playerCombos[username]?.level || 0;
  }, [playerCombos]);

  return {
    playerCombos,
    getPlayerCombo,
  };
}

export default useTvPlayerCombos;
