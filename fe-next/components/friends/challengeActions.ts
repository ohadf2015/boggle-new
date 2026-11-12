import type { Socket } from 'socket.io-client';

const ACCEPT_TIMEOUT_MS = 5000;

/** Accepts a friend challenge and resolves the room code, or null when the server refuses or is silent. */
export function acceptChallenge(socket: Socket, challengeId: string): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const settle = (roomCode: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.off('friends:challengeAccepted', onAccepted);
      socket.off('friends:error', onError);
      resolve(roomCode);
    };
    const onAccepted = (data: { challengeId?: string; roomCode?: string }) => {
      if (data?.challengeId === challengeId) settle(data.roomCode ?? null);
    };
    const onError = () => settle(null);
    socket.on('friends:challengeAccepted', onAccepted);
    socket.on('friends:error', onError);
    socket.emit('friends:acceptChallenge', { challengeId });
    timer = setTimeout(() => settle(null), ACCEPT_TIMEOUT_MS);
  });
}
