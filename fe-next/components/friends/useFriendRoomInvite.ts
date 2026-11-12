'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSocketOptional } from '@/utils/SocketContext';
import { sendChallengeWithAck } from '@/lib/friends/sendChallengeWithAck';
import { trackGrowthEvent } from '@/utils/growthTracking';
import type { Friend } from '@/utils/friendsTypes';

export type InviteState = 'idle' | 'busy' | 'sent';

/** One-tap "join my room" invite to a friend; shared by the invite sheet and the lobby strip. */
export function useFriendRoomInvite(gameCode: string, surface: string) {
  const { t } = useLanguage();
  const socketContext = useSocketOptional();
  const [states, setStates] = useState<Record<string, InviteState>>({});

  const invite = async (friend: Friend) => {
    const socket = socketContext?.socket;
    if (!socket || !socketContext?.isConnected) {
      toast.error(t('friendSocial.inviteFailed'));
      return;
    }
    setStates((s) => ({ ...s, [friend.odUserId]: 'busy' }));
    const res = await sendChallengeWithAck(socket, {
      friendUserId: friend.odUserId,
      challengeType: 'join_room',
      roomCode: gameCode,
    });
    if (res.ok) {
      setStates((s) => ({ ...s, [friend.odUserId]: 'sent' }));
      trackGrowthEvent('friend_invite_sent', { surface, online: friend.isOnline });
      toast.success(t('friendSocial.invitedName').replace('{name}', friend.displayName || friend.username));
    } else {
      setStates((s) => ({ ...s, [friend.odUserId]: res.code === 'CHALLENGE_ALREADY_SENT' ? 'sent' : 'idle' }));
      if (res.code !== 'CHALLENGE_ALREADY_SENT') toast.error(t('friendSocial.inviteFailed'));
    }
  };

  return { states, invite };
}
