'use client';

/**
 * useDuelRematch — makes REMATCH go somewhere.
 *
 * The reveal screen used to `emit('duel:rematch')` and stop there. The server
 * answers by INSERTing a new duel row and emitting `duel:created` with its id —
 * but nothing listened, so the student tapped REMATCH, the screen did not move,
 * and the only evidence anything happened was a challenge appearing in the
 * other kid's lobby. A no-op that emits nothing looks exactly like "this button
 * is broken" (recurring-pitfalls Class 4).
 *
 * This hook owns the whole round trip:
 *   request → pending (button says so) → duel:created → navigate
 *                                     └→ duel:error  → pending off, try again
 *
 * Only a rematch THIS device asked for navigates. `duel:created` also fires
 * when the student creates a challenge elsewhere in the app, and yanking
 * someone off their own podium because the room next door started a game is
 * exactly the kind of asymmetric-path bug Class 3 warns about.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import type { DuelCreatedData } from './useDuelSocket.types';

/** Give up waiting on the server after this long and let the student retry. */
export const DUEL_REMATCH_TIMEOUT_MS = 10_000;

export interface UseDuelRematchOptions {
  /** The live duel socket (null before it connects). */
  socket: { emit: (event: string, payload: unknown) => void } | null;
  opponentId?: string;
  lessonId?: string;
  onDuelCreated: (cb: (data: DuelCreatedData) => void) => () => void;
  onError: (cb: (data: { message: string }) => void) => () => void;
  /** Runs just before the emit — the reveal screen resets a decided series here. */
  onBeforeRequest?: () => void;
}

export interface UseDuelRematchReturn {
  /** True while the server has been asked and has not answered. */
  pending: boolean;
  /** False when there is nothing to rematch against (async duel, no lesson). */
  canRematch: boolean;
  requestRematch: () => void;
}

export function useDuelRematch({
  socket,
  opponentId,
  lessonId,
  onDuelCreated,
  onError,
  onBeforeRequest,
}: UseDuelRematchOptions): UseDuelRematchReturn {
  const router = useRouter();
  const { language } = useLanguage();
  const [pending, setPending] = useState(false);

  /** Only a rematch we asked for is allowed to navigate. */
  const awaitingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPending = useCallback(() => {
    awaitingRef.current = false;
    setPending(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => clearPending, [clearPending]);

  useEffect(() => {
    // Defensive: a duel screen must never white-screen because one listener is
    // missing. Rematch degrades to "does nothing" instead of taking the game
    // down with it.
    if (typeof onDuelCreated !== 'function' || typeof onError !== 'function') return;

    const cleanupCreated = onDuelCreated((data: DuelCreatedData) => {
      if (!awaitingRef.current) return;
      if (!data?.duelId) return;
      clearPending();
      router.push(`/${language}/education/duels/${data.duelId}`);
    });

    const cleanupError = onError(() => {
      if (!awaitingRef.current) return;
      clearPending();
    });

    return () => {
      cleanupCreated();
      cleanupError();
    };
  }, [onDuelCreated, onError, router, language, clearPending]);

  const canRematch = Boolean(socket && opponentId && lessonId);

  const requestRematch = useCallback(() => {
    if (!socket || !opponentId || !lessonId) return;
    if (awaitingRef.current) return;

    onBeforeRequest?.();

    awaitingRef.current = true;
    setPending(true);
    socket.emit('duel:rematch', { opponentId, lessonId });

    // A server that never answers must not leave a permanently dead button.
    timeoutRef.current = setTimeout(clearPending, DUEL_REMATCH_TIMEOUT_MS);
  }, [socket, opponentId, lessonId, onBeforeRequest, clearPending]);

  return { pending, canRematch, requestRematch };
}
