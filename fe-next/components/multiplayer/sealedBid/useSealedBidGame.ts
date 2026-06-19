'use client';

import { useCallback, useEffect, useState } from 'react';

/** Minimal socket surface — injectable so the hook unit-tests with a mock. */
export interface SealedBidSocketLike {
  on(event: string, handler: (data: unknown) => void): void;
  off(event: string, handler: (data: unknown) => void): void;
  emit(event: string, data: unknown): void;
}

export interface SbMpResult {
  username: string;
  word: string | null;
  outcome: 'unique' | 'clash' | 'none';
  basePoints: number;
  points: number;
}

export interface SealedBidClientState {
  rack: string | null;
  index: number;
  totalRounds: number;
  phase: 'bidding' | 'revealed' | 'done';
  scores: Record<string, number>;
  /** Last round's per-player results (revealed phase), else null. */
  results: SbMpResult[] | null;
  /** This client's locked bid for the current round, else null. */
  myLock: { word: string | null; valid: boolean } | null;
  lockProgress: { locked: number; total: number } | null;
  roundDeadline: number | null;
  winner: string | null;
}

// Server broadcast payloads (mirror backend/handlers/sealedBidHandler.ts).
interface InitPayload { players: string[]; racks: string[]; index: number; rack: string | null; phase: SealedBidClientState['phase']; scores: Record<string, number>; roundDeadline: number; totalRounds: number }
interface LockedPayload { word: string | null; valid: boolean }
interface LockProgressPayload { locked: number; total: number }
interface RoundResultPayload { index: number; rack: string | null; results: SbMpResult[]; scores: Record<string, number> }
interface NextRoundPayload { index: number; rack: string | null; roundDeadline: number; scores: Record<string, number> }
interface GameOverPayload { scores: Record<string, number>; winner: string | null }

const EMPTY: SealedBidClientState = {
  rack: null, index: 0, totalRounds: 0, phase: 'bidding', scores: {},
  results: null, myLock: null, lockProgress: null, roundDeadline: null, winner: null,
};

/**
 * Subscribes to the sealed-bid socket events and derives the live round state.
 * The MP view mounts on startGame, so the hook polls requestSealedBidState on
 * mount (and reconnect) and waits for sealedBidInit. Mirrors useShiritoriGame.
 */
export function useSealedBidGame(
  socket: SealedBidSocketLike | null,
  username: string,
): SealedBidClientState & { ready: boolean; submitBid: (word: string) => void } {
  const [state, setState] = useState<SealedBidClientState | null>(null);

  useEffect(() => {
    if (!socket) return;

    const onInit = (raw: unknown) => {
      const d = raw as InitPayload;
      setState({
        ...EMPTY,
        rack: d.rack,
        index: d.index,
        totalRounds: d.totalRounds,
        phase: d.phase,
        scores: d.scores ?? {},
        roundDeadline: d.roundDeadline ?? null,
      });
    };
    const onLocked = (raw: unknown) => {
      const d = raw as LockedPayload;
      setState((s) => (s ? { ...s, myLock: { word: d.word, valid: d.valid } } : s));
    };
    const onProgress = (raw: unknown) => {
      const d = raw as LockProgressPayload;
      setState((s) => (s ? { ...s, lockProgress: { locked: d.locked, total: d.total } } : s));
    };
    const onResult = (raw: unknown) => {
      const d = raw as RoundResultPayload;
      setState((s) => (s ? { ...s, phase: 'revealed', results: d.results, scores: d.scores ?? s.scores } : s));
    };
    const onNext = (raw: unknown) => {
      const d = raw as NextRoundPayload;
      setState((s) => (s ? {
        ...s, phase: 'bidding', rack: d.rack, index: d.index,
        scores: d.scores ?? s.scores, roundDeadline: d.roundDeadline ?? null,
        myLock: null, results: null, lockProgress: null,
      } : s));
    };
    const onOver = (raw: unknown) => {
      const d = raw as GameOverPayload;
      setState((s) => (s ? { ...s, phase: 'done', scores: d.scores ?? s.scores, winner: d.winner } : s));
    };
    const request = () => socket.emit('requestSealedBidState', {});

    socket.on('sealedBidInit', onInit);
    socket.on('sealedBidLocked', onLocked);
    socket.on('sealedBidLockProgress', onProgress);
    socket.on('sealedBidRoundResult', onResult);
    socket.on('sealedBidNextRound', onNext);
    socket.on('sealedBidGameOver', onOver);
    socket.on('connect', request);
    request();

    return () => {
      socket.off('sealedBidInit', onInit);
      socket.off('sealedBidLocked', onLocked);
      socket.off('sealedBidLockProgress', onProgress);
      socket.off('sealedBidRoundResult', onResult);
      socket.off('sealedBidNextRound', onNext);
      socket.off('sealedBidGameOver', onOver);
      socket.off('connect', request);
    };
  }, [socket, username]);

  const submitBid = useCallback((word: string) => {
    socket?.emit('submitSealedBid', { word });
  }, [socket]);

  return { ...(state ?? EMPTY), ready: state !== null, submitBid };
}
