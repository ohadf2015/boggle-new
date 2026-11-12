'use client';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import type { Socket } from 'socket.io-client';
import { resolveDisplayName } from '@/lib/displayName';

type T = (key: string, fallbackOrParams?: string | Record<string, string | number>, params?: Record<string, string | number>) => string;

interface AcceptedEvent {
  challengeId?: string;
  roomCode: string;
  challengeType?: 'new_game' | 'join_room';
  fromUserId?: string;
  toUsername?: string;
  toDisplayName?: string;
}

interface Options {
  socket: Socket | null;
  me: string | null;
  t: T;
  /** Where the player is right now; read at event time, so the listeners never re-register. */
  where: () => { inGame: boolean; inMultiplayer: boolean };
  goToRoom: (roomCode: string) => void;
}

export interface ReadyRoom {
  roomCode: string;
  name: string;
}

/**
 * Challenger-side outcomes of a friend challenge. The server echoes accepted/declined to the
 * player who answered too, so only events where I am the challenger (`fromUserId`) count.
 */
export function useChallengeOutcomes({ socket, me, t, where, goToRoom }: Options) {
  const [ready, setReady] = useState<ReadyRoom | null>(null);
  const latest = useRef({ t, where, goToRoom });
  latest.current = { t, where, goToRoom };

  useEffect(() => {
    if (!socket || !me) return;
    const nameOf = (names: Array<string | undefined>) => resolveDisplayName(names, latest.current.t('friends.aPlayer'));

    const onAccepted = (data: AcceptedEvent) => {
      if (data?.fromUserId !== me || !data.roomCode) return;
      const { t: tr, where: at, goToRoom: go } = latest.current;
      const name = nameOf([data.toDisplayName, data.toUsername]);
      const { inGame, inMultiplayer } = at();
      if (data.challengeType === 'join_room' && inMultiplayer && !inGame) {
        toast.success(tr('friends.challenges.friendAccepted', { name }));
        return;
      }
      if (inGame || inMultiplayer) {
        setReady({ roomCode: data.roomCode, name });
        return;
      }
      toast.success(tr('friends.challenges.friendAccepted', { name }));
      go(data.roomCode);
    };

    const onDeclined = (data: { fromUserId?: string; toUsername?: string; toDisplayName?: string }) => {
      if (data?.fromUserId !== me) return;
      const name = nameOf([data.toDisplayName, data.toUsername]);
      toast(latest.current.t('friends.challengeDeclinedToast', { name }), { icon: '🚫' });
    };

    const onResult = (data: { winnerUserId: string | null; scores?: Record<string, number> }) => {
      const scores = data?.scores ?? {};
      const theirs = Object.entries(scores).find(([uid]) => uid !== me)?.[1];
      const isTie = data.winnerUserId === null;
      const didWin = data.winnerUserId === me;
      const key = isTie ? 'friends.challenges.resultTie' : didWin ? 'friends.challenges.resultWin' : 'friends.challenges.resultLoss';
      toast(latest.current.t(key, { mine: String(scores[me] ?? '?'), theirs: String(theirs ?? '?') }), {
        icon: isTie ? '🤝' : didWin ? '🏆' : '💔',
      });
    };

    socket.on('friends:challengeAccepted', onAccepted);
    socket.on('friends:challengeDeclined', onDeclined);
    socket.on('friends:challengeResult', onResult);
    return () => {
      socket.off('friends:challengeAccepted', onAccepted);
      socket.off('friends:challengeDeclined', onDeclined);
      socket.off('friends:challengeResult', onResult);
    };
  }, [socket, me]);

  return { ready, clearReady: () => setReady(null) };
}
