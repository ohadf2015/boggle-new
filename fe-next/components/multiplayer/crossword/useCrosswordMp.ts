'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CrosswordPuzzle } from '@/lib/crossword/types';

/** Minimal socket surface — injectable so the hook unit-tests with a mock. */
export interface CrosswordMpSocketLike {
  on(event: string, handler: (data: unknown) => void): void;
  off(event: string, handler: (data: unknown) => void): void;
  emit(event: string, data: unknown): void;
}

export interface CrosswordStanding {
  username: string;
  percent: number;
  solved: boolean;
  elapsedMs: number;
  score: number;
  rank: number;
}

export interface CrosswordProgressUpdate {
  percent: number;
  solved: boolean;
  elapsedMs: number;
  score: number;
}

interface InitPayload { puzzle: CrosswordPuzzle; players: string[]; standings: CrosswordStanding[]; startedAt: number }
interface StandingsPayload { standings: CrosswordStanding[] }

export interface CrosswordMpState {
  puzzle: CrosswordPuzzle | null;
  standings: CrosswordStanding[];
  raceOver: boolean;
  ready: boolean;
}

/**
 * Receives the shared CrosswordPuzzle + live standings from the server and emits
 * this client's progress. The race view mounts on startGame, so the hook polls
 * requestCrosswordMpState on mount (and reconnect). Mirrors useSealedBidGame.
 */
export function useCrosswordMp(
  socket: CrosswordMpSocketLike | null,
): CrosswordMpState & { submitProgress: (u: CrosswordProgressUpdate) => void } {
  const [puzzle, setPuzzle] = useState<CrosswordPuzzle | null>(null);
  const [standings, setStandings] = useState<CrosswordStanding[]>([]);
  const [raceOver, setRaceOver] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const onInit = (raw: unknown) => {
      const d = raw as InitPayload;
      setPuzzle(d.puzzle);
      setStandings(d.standings ?? []);
    };
    const onStandings = (raw: unknown) => setStandings((raw as StandingsPayload).standings ?? []);
    const onOver = (raw: unknown) => {
      setStandings((raw as StandingsPayload).standings ?? []);
      setRaceOver(true);
    };
    const request = () => socket.emit('requestCrosswordMpState', {});

    socket.on('crosswordMpInit', onInit);
    socket.on('crosswordStandings', onStandings);
    socket.on('crosswordRaceOver', onOver);
    socket.on('connect', request);
    request();

    return () => {
      socket.off('crosswordMpInit', onInit);
      socket.off('crosswordStandings', onStandings);
      socket.off('crosswordRaceOver', onOver);
      socket.off('connect', request);
    };
  }, [socket]);

  const submitProgress = useCallback((u: CrosswordProgressUpdate) => {
    socket?.emit('submitCrosswordProgress', u);
  }, [socket]);

  return { puzzle, standings, raceOver, ready: puzzle !== null, submitProgress };
}
