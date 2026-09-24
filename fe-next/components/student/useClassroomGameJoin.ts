'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Socket } from 'socket.io-client';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ActiveGame } from '@/hooks/useActiveClassroomGame';

/** Long enough for a slow phone on school wifi, short enough to not be a hang. */
export const JOIN_TIMEOUT_MS = 12_000;

interface Args {
  activeGame: ActiveGame | null;
  socket: Socket | null;
  userId: string;
  username: string;
}

/**
 * Join the class's live game and navigate ONLY once the server acks it.
 *
 * Extracted from `ClassroomGameBanner` so the Academy Map's big "Join live game"
 * button and the banner run the exact same join (recurring pitfall class 3):
 *  - navigating in the same tick as the emit rendered the server's rejection
 *    nowhere (class 4), so we wait for `joinedClassroomGame`;
 *  - `classroomGameError` is a shared channel (the 15s poll emits on it too),
 *    so only a rejection naming THIS game settles the join;
 *  - silence is a failure too — the timeout says so.
 */
export function useClassroomGameJoin({ activeGame, socket, userId, username }: Args) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  /** Torn down when a join settles, so listeners never stack up on the socket. */
  const cleanupJoinRef = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanupJoinRef.current?.(), []);

  const join = useCallback(() => {
    // Without a room code the push would land on the bare multiplayer hub —
    // "No battles in progress". Do nothing visible rather than go somewhere wrong.
    if (!activeGame?.gameCode || !socket) return;

    const gameCode = activeGame.gameCode;
    setJoinError(null);
    setIsJoining(true);

    const settle = () => {
      clearTimeout(timer);
      socket.off('joinedClassroomGame', onJoined);
      socket.off('classroomGameError', onError);
      cleanupJoinRef.current = null;
    };

    const onJoined = (data: { gameCode?: string }) => {
      // A shared socket can carry another game's ack; only ours releases us.
      if (data?.gameCode && data.gameCode !== gameCode) return;
      settle();
      setIsJoining(false);
      // `room`, not `code` — nothing reads `?code=`.
      router.push(`/${language}/multiplayer?room=${gameCode}&classroom=true`);
    };

    const onError = (data: { gameCode?: string }) => {
      if (data?.gameCode !== gameCode) return;
      settle();
      setIsJoining(false);
      setJoinError(t('student.activeGame.joinFailed'));
    };

    const timer = setTimeout(() => {
      settle();
      setIsJoining(false);
      setJoinError(t('student.activeGame.joinFailed'));
    }, JOIN_TIMEOUT_MS);

    socket.on('joinedClassroomGame', onJoined);
    socket.on('classroomGameError', onError);
    cleanupJoinRef.current = settle;

    socket.emit('joinClassroomGame', { gameCode, userId, username });
  }, [activeGame, socket, userId, username, router, language, t]);

  return { join, isJoining, joinError };
}
