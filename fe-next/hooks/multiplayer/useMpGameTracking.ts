/**
 * Hook: useMpGameTracking
 * Centralizes MP game start/end tracking with deduplication
 *
 * Tracks game session by (gameCode + roundIndex) to prevent double-fires.
 * Fires trackMpGameStart on game start, trackMpGameEnd on results display.
 */

import { useRef, useCallback } from 'react';
import { trackMpGameStart, trackMpGameEnd } from '@/utils/mpGameTracking';
import type { GameMode } from '@/shared/types/game';

interface UseMpGameTrackingArgs {
  gameCode: string;
  gameMode: GameMode;
  roundIndex: number;
  playerCount: number;
}

export function useMpGameTracking(args: UseMpGameTrackingArgs) {
  const firedRef = useRef<Set<string>>(new Set());

  const trackStart = useCallback(() => {
    const key = `${args.gameCode}:${args.roundIndex}:start`;
    if (firedRef.current.has(key)) return;

    firedRef.current.add(key);
    trackMpGameStart({
      gameMode: args.gameMode,
      roundIndex: args.roundIndex,
      playerCount: args.playerCount,
      gameCode: args.gameCode,
    });
  }, [args]);

  const trackEnd = useCallback((score: number, wordCount: number, durationSec: number, isWinner: boolean) => {
    const key = `${args.gameCode}:${args.roundIndex}:end`;
    if (firedRef.current.has(key)) return;

    firedRef.current.add(key);
    trackMpGameEnd({
      gameMode: args.gameMode,
      roundIndex: args.roundIndex,
      playerCount: args.playerCount,
      gameCode: args.gameCode,
      score,
      wordCount,
      durationSec,
      isWinner,
    });
  }, [args]);

  return { trackStart, trackEnd };
}
