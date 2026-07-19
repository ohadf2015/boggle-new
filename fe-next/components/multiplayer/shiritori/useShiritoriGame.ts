'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ShiritoriPlayerView } from './ShiritoriView';

/** Minimal socket surface — injectable so the hook unit-tests with a mock. */
export interface ShiritoriSocketLike {
  on(event: string, handler: (data: unknown) => void): void;
  off(event: string, handler: (data: unknown) => void): void;
  emit(event: string, data: unknown): void;
}

export interface ShiritoriClientState {
  chain: string[];
  requiredHead: string | null;
  players: ShiritoriPlayerView[];
  currentPlayer: string | null;
  finished: boolean;
  winner: string | null;
  lastError: string | null;
  /** Unix-ms when the current turn started; null before the first move. */
  turnStartedAt: number | null;
}

// Server broadcast payloads (mirror backend/handlers/shiritoriHandler.ts).
interface AcceptedPayload { word: string; by: string; requiredHead: string | null; nextPlayer?: string | null }
interface RejectedPayload { word: string; error: string }
interface EliminatedPayload { player: string; reason: string; nextPlayer?: string | null }
interface GameOverPayload { winner: string | null; reason: string; loser?: string }

/**
 * Subscribes to the shiritori socket events and derives ShiritoriView props.
 * The MP view passes the real Socket.IO client + the initial roster/turn from
 * the startGame payload; this hook owns the live turn-chain state.
 */
/** Optional snapshot to seed mid-game state (reconnect / late join). */
export interface ShiritoriInitialSnapshot {
  chain?: string[];
  requiredHead?: string | null;
  eliminated?: string[];
  finished?: boolean;
  winner?: string | null;
}

export function useShiritoriGame(
  socket: ShiritoriSocketLike | null,
  initialPlayers: string[],
  firstPlayer: string | null,
  initial?: ShiritoriInitialSnapshot,
): ShiritoriClientState & { submit: (word: string) => void } {
  const [state, setState] = useState<ShiritoriClientState>(() => {
    const eliminatedSet = new Set(initial?.eliminated ?? []);
    return {
      chain: initial?.chain ?? [],
      requiredHead: initial?.requiredHead ?? null,
      players: initialPlayers.map((username) => ({ username, eliminated: eliminatedSet.has(username) })),
      currentPlayer: firstPlayer,
      finished: initial?.finished ?? false,
      winner: initial?.winner ?? null,
      lastError: null,
      turnStartedAt: firstPlayer ? Date.now() : null,
    };
  });

  useEffect(() => {
    if (!socket) return;

    const onAccepted = (raw: unknown) => {
      const d = raw as AcceptedPayload;
      setState((s) => ({
        ...s,
        chain: [...s.chain, d.word],
        requiredHead: d.requiredHead,
        currentPlayer: d.nextPlayer ?? s.currentPlayer,
        lastError: null,
        turnStartedAt: Date.now(),
      }));
    };
    const onRejected = (raw: unknown) => {
      const d = raw as RejectedPayload;
      setState((s) => ({ ...s, lastError: d.error }));
    };
    const onEliminated = (raw: unknown) => {
      const d = raw as EliminatedPayload;
      setState((s) => ({
        ...s,
        players: s.players.map((p) => (p.username === d.player ? { ...p, eliminated: true } : p)),
        currentPlayer: d.nextPlayer ?? s.currentPlayer,
        turnStartedAt: Date.now(),
      }));
    };
    const onGameOver = (raw: unknown) => {
      const d = raw as GameOverPayload;
      setState((s) => ({
        ...s,
        finished: true,
        winner: d.winner,
        // Mark the final loser eliminated — shiritoriGameOver skips the
        // shiritoriPlayerEliminated event for the last player, so the turn-rail
        // would show them as still active without this.
        players: d.loser
          ? s.players.map((p) => (p.username === d.loser ? { ...p, eliminated: true } : p))
          : s.players,
      }));
    };

    socket.on('shiritoriWordAccepted', onAccepted);
    socket.on('shiritoriWordRejected', onRejected);
    socket.on('shiritoriPlayerEliminated', onEliminated);
    socket.on('shiritoriGameOver', onGameOver);
    return () => {
      socket.off('shiritoriWordAccepted', onAccepted);
      socket.off('shiritoriWordRejected', onRejected);
      socket.off('shiritoriPlayerEliminated', onEliminated);
      socket.off('shiritoriGameOver', onGameOver);
    };
  }, [socket]);

  const submit = useCallback(
    (word: string) => {
      socket?.emit('submitShiritoriWord', { word });
    },
    [socket],
  );

  return { ...state, submit };
}
