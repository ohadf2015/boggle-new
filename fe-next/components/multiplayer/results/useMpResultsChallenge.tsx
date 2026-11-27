'use client';

import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { ChallengeInviteDialog } from '@/components/friends/ChallengeInviteDialog';
import { sendChallengeWithAck } from '@/lib/friends/sendChallengeWithAck';
import { useSocketOptional } from '@/utils/SocketContext';

type TFn = (key: string, params?: Record<string, string | number>) => string;
type ChallengeFriend = { odUserId: string; username: string; displayName?: string };

/** The results screen's one-friend live challenge: who is being challenged, the send, and its dialog. */
export function useMpResultsChallenge({ gameCode, t }: { gameCode?: string; t: TFn }) {
  const socketCtx = useSocketOptional();
  const challengeSocket = socketCtx?.socket ?? null;
  const challengeConnected = !!socketCtx?.isConnected;
  const [challengeFriend, setChallengeFriend] = useState<ChallengeFriend | null>(null);

  const handleSendChallenge = useCallback(async (
    friendId: string,
    challengeType: 'new_game' | 'join_room',
    settings?: { language?: string; timerSeconds?: number; mode?: string; message?: string; flow?: 'async' | 'live' },
  ) => {
    // Results only offers live (allowedFlows=['live']). Async would promise a
    // score-to-beat path this surface does not implement — reject rather than
    // fake success via share modal.
    if (settings?.flow === 'async') {
      toast.error(t('friends.errors.sendFailed'));
      throw new Error('ASYNC_UNSUPPORTED_ON_RESULTS');
    }
    if (!challengeSocket || !challengeConnected) {
      toast.error(t('friends.errors.sendFailed'));
      throw new Error('NOT_CONNECTED');
    }
    const result = await sendChallengeWithAck(challengeSocket, {
      friendUserId: friendId,
      challengeType,
      roomCode: gameCode || undefined,
      gameSettings: settings ? {
        language: settings.language,
        timerSeconds: settings.timerSeconds,
        mode: settings.mode,
      } : undefined,
      message: settings?.message,
    });
    if (!result.ok) {
      toast.error(t('friends.errors.sendFailed'));
      throw new Error(result.code);
    }
    toast.success(t('friends.challenges.sent'));
    setChallengeFriend(null);
  }, [challengeSocket, challengeConnected, t, gameCode]);

  const challengeDialog = (
    <>
      {challengeFriend && (
        <ChallengeInviteDialog
          isOpen={!!challengeFriend}
          friendUsername={challengeFriend.displayName || challengeFriend.username}
          friendId={challengeFriend.odUserId}
          onClose={() => setChallengeFriend(null)}
          onSendChallenge={handleSendChallenge}
          allowedFlows={['live']}
        />
      )}
    </>
  );

  return { challengeFriend, setChallengeFriend, challengeDialog };
}
