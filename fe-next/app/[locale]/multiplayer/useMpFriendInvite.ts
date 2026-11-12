'use client';

import { createElement, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import type { Socket } from 'socket.io-client';
import { generateGameCode } from '@/components/multiplayer/useQuickPlay';
import { sendChallengeWithAck } from '@/lib/friends/sendChallengeWithAck';
import { trackGrowthEvent } from '@/utils/growthTracking';
import type { Language } from '@/shared/types/game';
import type { HandleJoinFn } from './useMultiplayerJoin';

export interface MpFriendInviteArgs {
  inviteUserId: string | null;
  /** A `?room=` link wins: the player is joining someone else's room. */
  roomParam: string | null;
  isAuthenticated: boolean;
  socket: Socket | null;
  isConnected: boolean;
  isActive: boolean;
  isHost: boolean;
  gameCode: string;
  hostName: string;
  language: Language;
  t: (key: string) => string;
  handleJoin: HandleJoinFn;
  setGameCode: (code: string) => void;
  setRoomName: (name: string) => void;
  setHostUsername: (name: string) => void;
  setUsername: (name: string) => void;
}

/** `/multiplayer?invite=<friendUserId>`: open a room as host, then send that friend a join invite to it. */
export function useMpFriendInvite(args: MpFriendInviteArgs) {
  const inviteUserId = args.roomParam ? null : args.inviteUserId;
  const { isAuthenticated, socket, isConnected, isActive, isHost, gameCode, hostName } = args;
  const created = useRef<string | null>(null);
  const sent = useRef(false);
  const latest = useRef(args);
  latest.current = args;

  useEffect(() => {
    if (!inviteUserId || !isAuthenticated || !isConnected || isActive || !hostName || created.current) return;
    created.current = inviteUserId;
    stripInviteParam();
    const a = latest.current;
    const code = generateGameCode();
    const roomName = `${hostName} Room`;
    a.setGameCode(code);
    a.setRoomName(roomName);
    a.setHostUsername(hostName);
    a.setUsername(hostName);
    a.handleJoin(true, a.language, code, roomName, hostName);
  }, [inviteUserId, isAuthenticated, isConnected, isActive, hostName]);

  useEffect(() => {
    const friendUserId = created.current;
    if (!friendUserId || sent.current || !socket || !isActive || !isHost || !gameCode) return;
    sent.current = true;
    const { t } = latest.current;
    const send = () =>
      sendChallengeWithAck(socket, { friendUserId, challengeType: 'join_room', roomCode: gameCode }).then((res) => {
        if (res.ok) {
          trackGrowthEvent('friend_invite_sent', { surface: 'home_invite' });
          toast.success(t('friends.challenges.sent'));
          return;
        }
        if (res.code === 'CHALLENGE_ALREADY_SENT') return;
        sent.current = false;
        toast.error((tt) =>
          createElement('span', { className: 'flex items-center gap-2' }, t('friendSocial.inviteFailed'),
            createElement('button', {
              type: 'button',
              className: 'rounded-neo border-2 border-neo-black bg-neo-lime px-2 font-bold text-neo-black',
              onClick: () => {
                toast.dismiss(tt.id);
                sent.current = true;
                void send();
              },
            }, t('common.retry'))),
        );
      });
    void send();
  }, [socket, isActive, isHost, gameCode]);
}

function stripInviteParam() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('invite');
    window.history.replaceState(window.history.state, '', url.toString());
  } catch {
    /* a reload would just open one more room */
  }
}
