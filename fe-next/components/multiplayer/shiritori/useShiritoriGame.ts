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
export function useShiritoriGame(
  socket: ShiritoriSocketLike | null,
  initialPlayers: string[],
  firstPlayer: string | null,
): ShiritoriClientState & { submit: (word: string) => void } {
  const [state, setState] = useState<ShiritoriClientState>(() => ({
    chain: [],
    requiredHead: null,
    players: initialPlayers.map((username) => ({ username, eliminated: false })),
    currentPlayer: firstPlayer,
    finished: false,
    winner: null,
    lastError: null,
  }));

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
      }));
    };
    const onGameOver = (raw: unknown) => {
      const d = raw as GameOverPayload;
      setState((s) => ({ ...s, finished: true, winner: d.winner }));
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
