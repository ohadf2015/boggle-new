import type { Socket } from 'socket.io-client';

export interface SendChallengePayload {
  friendUserId: string;
  challengeType: 'new_game' | 'join_room';
  roomCode?: string;
  gameSettings?: {
    language?: string;
    timerSeconds?: number;
    mode?: string;
  };
  message?: string;
}

export type SendChallengeResult =
  | { ok: true; data: { challengeId: string; roomCode: string } }
  | { ok: false; code: string };

const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Emits friends:sendChallenge and resolves only after the server confirms or
 * rejects. Without this, callers were toasting "sent ✅" before the server
 * replied — masking NOT_FRIENDS, VALIDATION_FAILED, SERVER_ERROR, and rate
 * limits behind a green checkmark.
 */
export function sendChallengeWithAck(
  socket: Pick<Socket, 'emit' | 'on' | 'off'>,
  payload: SendChallengePayload,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<SendChallengeResult> {
  return new Promise((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      socket.off('friends:challengeSent', onSent);
      socket.off('friends:error', onError);
      socket.off('rateLimited', onRateLimited);
      if (timer) clearTimeout(timer);
    };
    const settle = (result: SendChallengeResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const onSent = (data: unknown) => {
      const d = data as { challengeId?: string; roomCode?: string } | undefined;
      settle({
        ok: true,
        data: { challengeId: d?.challengeId ?? '', roomCode: d?.roomCode ?? '' },
      });
    };
    const onError = (data: unknown) => {
      const code = (data as { code?: string } | undefined)?.code ?? 'SERVER_ERROR';
      settle({ ok: false, code });
    };
    const onRateLimited = () => settle({ ok: false, code: 'RATE_LIMITED' });

    socket.on('friends:challengeSent', onSent);
    socket.on('friends:error', onError);
    socket.on('rateLimited', onRateLimited);

    timer = setTimeout(() => settle({ ok: false, code: 'TIMEOUT' }), timeoutMs);

    socket.emit('friends:sendChallenge', payload);
  });
}
