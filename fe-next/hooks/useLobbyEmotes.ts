import { useState, useEffect, useCallback, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import {
  isLobbyEmoteId,
  type LobbyEmoteId,
} from '@/lib/lobby/lobbyEmotes';
import { MOOD_DURATION_MS } from '@/lib/avatar/avatarMood';

/** Local cooldown between emotes — mirrors the server's per-action limit (2/s). */
const EMOTE_COOLDOWN_MS = 1500;
const DEFAULT_EMOTE_MS = 1800;

interface UseLobbyEmotesParams {
  socket: Socket | null;
}

/** A live emote on a player's avatar. `nonce` bumps so a repeat re-triggers the animation. */
export interface ActiveEmote {
  emote: LobbyEmoteId;
  nonce: number;
}

/**
 * Lobby emote transport — shared by the player waiting view and the host roster.
 *
 * Ephemeral by design: no server persistence. An emote lives for its mood
 * duration then auto-clears. The server echoes `lobbyEmoteUpdate` to EVERYONE in
 * the room (sender included), so every client — including the sender — keys the
 * emote by the same server-authoritative username that names its roster tile.
 * No optimistic self-apply → no local-vs-server name drift.
 */
export function useLobbyEmotes({ socket }: UseLobbyEmotesParams) {
  const [emotesByUsername, setEmotesByUsername] = useState<
    Record<string, ActiveEmote>
  >({});
  const [cooldownActive, setCooldownActive] = useState(false);

  // Ref guard so two synchronous sends can't both pass the cooldown check
  // (state updates are async → a state-only guard would race).
  const cooldownRef = useRef(false);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const applyEmote = useCallback((user: string, emote: LobbyEmoteId) => {
    setEmotesByUsername((prev) => ({
      ...prev,
      [user]: { emote, nonce: (prev[user]?.nonce ?? 0) + 1 },
    }));
    const existing = clearTimers.current[user];
    if (existing) clearTimeout(existing);
    clearTimers.current[user] = setTimeout(() => {
      setEmotesByUsername((prev) => {
        const next = { ...prev };
        delete next[user];
        return next;
      });
      delete clearTimers.current[user];
    }, MOOD_DURATION_MS[emote] ?? DEFAULT_EMOTE_MS);
  }, []);

  const sendEmote = useCallback(
    (emote: LobbyEmoteId) => {
      if (cooldownRef.current) return;
      if (!isLobbyEmoteId(emote)) return;

      socket?.emit('lobbyEmote', { emote });
      // No optimistic self-apply — the server echoes back to the sender too, and
      // that echo carries the canonical username the roster keys by.

      cooldownRef.current = true;
      setCooldownActive(true);
      cooldownTimer.current = setTimeout(() => {
        cooldownRef.current = false;
        setCooldownActive(false);
      }, EMOTE_COOLDOWN_MS);
    },
    [socket],
  );

  // Receive emotes from other players in the room.
  useEffect(() => {
    if (!socket) return;
    const handle = (data: { username?: string; emote?: unknown }) => {
      if (data?.username && isLobbyEmoteId(data.emote)) {
        applyEmote(data.username, data.emote);
      }
    };
    socket.on('lobbyEmoteUpdate', handle);
    return () => {
      socket.off('lobbyEmoteUpdate', handle);
    };
  }, [socket, applyEmote]);

  // Clear all timers on unmount (resource-cleanup rule).
  useEffect(() => {
    const timers = clearTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
    };
  }, []);

  return { emotesByUsername, sendEmote, cooldownActive };
}
