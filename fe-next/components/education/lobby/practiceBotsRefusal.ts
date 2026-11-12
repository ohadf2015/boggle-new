import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { AUTO_FILL_REFUSAL_REASONS, type AutoFillRefusalReason } from '@/shared/types/autoFillRefusal';

export const PRACTICE_BOTS_FALLBACK_KEY = 'tvLobby.practiceRoundFailed';

export function practiceBotsRefusalKey(reason: unknown): string {
  return AUTO_FILL_REFUSAL_REASONS.includes(reason as AutoFillRefusalReason)
    ? `tvLobby.practiceRefused.${reason as AutoFillRefusalReason}`
    : PRACTICE_BOTS_FALLBACK_KEY;
}

/**
 * While a practice-bots request is pending, hands the server's refusal to the lobby as a message key,
 * and says when bots from an earlier practice run already fill the room (no new seat will appear).
 */
export function usePracticeBotsRefusal(
  socket: Pick<Socket, 'on' | 'off'> | null,
  pending: boolean,
  onRefused: (messageKey: string) => void,
  onAlreadySeated?: () => void,
): void {
  const latest = useRef({ onRefused, onAlreadySeated });
  latest.current = { onRefused, onAlreadySeated };
  useEffect(() => {
    if (!socket || !pending) return;
    const refused = (payload: { reason?: unknown } | undefined) => latest.current.onRefused(practiceBotsRefusalKey(payload?.reason));
    const complete = (payload: { alreadySeated?: boolean } | undefined) => {
      if (payload?.alreadySeated) latest.current.onAlreadySeated?.();
    };
    socket.on('autoFillRefused', refused);
    socket.on('autoFillComplete', complete);
    return () => {
      socket.off('autoFillRefused', refused);
      socket.off('autoFillComplete', complete);
    };
  }, [socket, pending]);
}
