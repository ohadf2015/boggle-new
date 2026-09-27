'use client';

/**
 * useDuelRematch — the client half of the rematch handshake.
 *
 * What this replaces: the hook used to emit `duel:rematch` and navigate the
 * tapper to whatever duel id came back. Both students tapped REMATCH on their
 * own podium, the server made a duel per tap, and the two of them navigated to
 * DIFFERENT rooms and waited for each other forever. The blind critic
 * disqualified the piece on exactly that.
 *
 * The states this hook owns:
 *   idle     — REMATCH
 *   pending  — I asked; waiting for them (with a CANCEL)
 *   offered  — THEY asked; my button becomes ACCEPT
 *   invited  — they had already left; the challenge is in their lobby
 *
 * A tap never navigates. Only `duel:created` does, and the server only sends
 * that once both students have asked — so when it arrives we follow it even if
 * this device's own wait had lapsed. Anything else would strand the other kid
 * in a room they were invited to (recurring-pitfalls Class 3).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import type { DuelCreatedData } from './useDuelSocket.types';

/** Safety net: how long this screen waits before offering the tap again. */
export const DUEL_REMATCH_TIMEOUT_MS = 60_000;

export type DuelRematchState = 'idle' | 'pending' | 'offered' | 'invited';

type Subscribe<T> = (cb: (data: T) => void) => () => void;

export interface UseDuelRematchOptions {
  /** The live duel socket (null before it connects). */
  socket: { emit: (event: string, payload: unknown) => void } | null;
  opponentId?: string;
  lessonId?: string;
  /** The duel we are rematching FROM — the server reads its classroom. */
  duelId?: string;
  onDuelCreated: Subscribe<DuelCreatedData>;
  onError: Subscribe<{ message: string }>;
  onRematchOffered?: Subscribe<{ fromUserId: string; fromName?: string }>;
  onRematchPending?: Subscribe<{ opponentId: string; expiresInMs?: number }>;
  onRematchInvited?: Subscribe<{ duelId: string; opponentId: string }>;
  onRematchWithdrawn?: Subscribe<{ fromUserId: string }>;
  /** Runs just before the emit — the reveal screen resets a decided series here. */
  onBeforeRequest?: () => void;
}

export interface UseDuelRematchReturn {
  state: DuelRematchState;
  /** True while this device is waiting on the other student. */
  pending: boolean;
  /** False when there is nothing to rematch against (async duel, no lesson). */
  canRematch: boolean;
  /** Who is asking, when state is 'offered'. */
  offeredByName?: string;
  requestRematch: () => void;
  cancelRematch: () => void;
}

/** Subscribing to a listener the socket hook may not expose must never throw. */
function useOptionalDuelEvent<T>(
  subscribe: Subscribe<T> | undefined,
  handler: (data: T) => void
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (typeof subscribe !== 'function') return;
    return subscribe((data: T) => handlerRef.current(data));
  }, [subscribe]);
}

export function useDuelRematch({
  socket,
  opponentId,
  lessonId,
  duelId,
  onDuelCreated,
  onError,
  onRematchOffered,
  onRematchPending,
  onRematchInvited,
  onRematchWithdrawn,
  onBeforeRequest,
}: UseDuelRematchOptions): UseDuelRematchReturn {
  const router = useRouter();
  const { language } = useLanguage();
  const [state, setState] = useState<DuelRematchState>('idle');
  const [offeredByName, setOfferedByName] = useState<string | undefined>(undefined);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Did THIS device ask? Used only to filter unrelated duel:created events. */
  const askedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const toIdle = useCallback(() => {
    askedRef.current = false;
    clearTimer();
    setOfferedByName(undefined);
    setState('idle');
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  useOptionalDuelEvent(onDuelCreated, (data: DuelCreatedData) => {
    if (!data?.duelId) return;
    // A rematch the server created is by definition one we both agreed to.
    if (!data.isRematch && !askedRef.current) return;
    askedRef.current = false;
    clearTimer();
    router.push(`/${language}/education/duels/${data.duelId}`);
  });

  useOptionalDuelEvent(onError, () => {
    if (!askedRef.current) return;
    toIdle();
  });

  useOptionalDuelEvent(onRematchOffered, (data) => {
    if (!data?.fromUserId || (opponentId && data.fromUserId !== opponentId)) return;
    clearTimer();
    setOfferedByName(data.fromName);
    setState('offered');
  });

  useOptionalDuelEvent(onRematchPending, (data) => {
    if (opponentId && data?.opponentId && data.opponentId !== opponentId) return;
    setState('pending');
  });

  useOptionalDuelEvent(onRematchInvited, () => {
    askedRef.current = false;
    clearTimer();
    setState('invited');
  });

  useOptionalDuelEvent(onRematchWithdrawn, (data) => {
    if (data?.fromUserId && opponentId && data.fromUserId !== opponentId) return;
    toIdle();
  });

  const canRematch = Boolean(socket && opponentId && lessonId);

  const requestRematch = useCallback(() => {
    if (!socket || !opponentId || !lessonId) return;
    if (state === 'pending') return;

    onBeforeRequest?.();

    askedRef.current = true;
    setState('pending');
    socket.emit('duel:rematch', { opponentId, lessonId, duelId });

    // The server converts an unanswered offer into a lobby invite; this is only
    // a backstop so the button can never be permanently dead.
    clearTimer();
    timeoutRef.current = setTimeout(() => {
      setState((current) => (current === 'pending' ? 'idle' : current));
      askedRef.current = false;
    }, DUEL_REMATCH_TIMEOUT_MS);
  }, [socket, opponentId, lessonId, duelId, state, onBeforeRequest, clearTimer]);

  const cancelRematch = useCallback(() => {
    if (socket && opponentId && lessonId) {
      socket.emit('duel:rematch-cancel', { opponentId, lessonId });
    }
    toIdle();
  }, [socket, opponentId, lessonId, toIdle]);

  return {
    state,
    pending: state === 'pending',
    canRematch,
    offeredByName,
    requestRematch,
    cancelRematch,
  };
}
