'use client';

/**
 * Reload mid-game returns to the game.
 *
 * `useMultiplayerSession` decides on mount whether this load is a fresh reload
 * of a seated player (page refresh, session < 5 min old, no intentional exit)
 * and raises `pending`. This hook then re-emits the same `join` the reconnect
 * path uses once the socket is up. The server answers `joined` (and, mid-round,
 * `startGame` + `updateLeaderboard`), or an error whose 'gone' branch returns
 * the player to the entry with feedback.
 *
 * Before this, `pending` went to a no-op and the first connect after a reload
 * never re-emitted `join` — the joiner landed on the room list (baseline 14_*).
 */
import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { getSession } from '@/utils/session';
import { buildRejoinPayload } from '@/lib/multiplayer/reloadRejoin';
import logger from '@/utils/logger';

export interface UseReloadRejoinInput {
  /** Raised by useMultiplayerSession for a fresh, seated reload. */
  pending: boolean;
  socket: Socket | null;
  isConnected: boolean;
  /** Already in a room — nothing to restore. */
  isActive: boolean;
  /** Lower `pending` (emitted, or nothing to rejoin). */
  onSettled: () => void;
  /** A rejoin was sent (drives the "rejoining" state / toast). */
  onRejoining?: () => void;
}

export function useReloadRejoin({ pending, socket, isConnected, isActive, onSettled, onRejoining }: UseReloadRejoinInput): void {
  useEffect(() => {
    if (!pending || isActive || !socket || !isConnected) return;
    const payload = buildRejoinPayload(getSession(), (socket.auth as Record<string, unknown> | undefined)?.token);
    if (payload) {
      logger.log('[RELOAD] Rejoining saved room after reload:', payload.gameCode);
      onRejoining?.();
      socket.emit('join', payload);
    }
    onSettled();
  }, [pending, isActive, socket, isConnected, onSettled, onRejoining]);
}
