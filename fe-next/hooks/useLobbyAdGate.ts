'use client';

import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { useRewardAdPause } from '@/hooks/useRewardAdPause';

interface UseLobbyAdGateParams {
  socket: Socket | null;
}

/**
 * Lobby ad-gate bridge.
 *
 * Echoes this client's local rewarded-ad state (from the {@link useRewardAdPause}
 * bus) to the room via `lobby:adWatching`, and tracks the room-wide set of
 * watchers from `lobbyAdWatchingUpdate`. `anyAdActive` is true when this player
 * OR any other player in the lobby is mid-ad — the host uses it to disable Start
 * so the game can't begin while someone is watching an ad for a reward.
 */
export function useLobbyAdGate({ socket }: UseLobbyAdGateParams) {
  const localAdActive = useRewardAdPause();
  const [watchers, setWatchers] = useState<string[]>([]);
  const everActiveRef = useRef(false);

  // Echo local ad state to the server. Skip the initial inactive state so we
  // don't spam a no-op active=false before this client has ever watched.
  useEffect(() => {
    if (!socket) return;
    if (localAdActive) {
      everActiveRef.current = true;
      socket.emit('lobby:adWatching', { active: true });
    } else if (everActiveRef.current) {
      socket.emit('lobby:adWatching', { active: false });
    }
  }, [socket, localAdActive]);

  // If we unmount mid-ad (game start, navigation), clear our flag so the host's
  // Start isn't wedged. The server's disconnect cleanup is the backstop.
  useEffect(() => {
    return () => {
      if (everActiveRef.current && socket) {
        socket.emit('lobby:adWatching', { active: false });
      }
    };
  }, [socket]);

  // Room-wide watcher presence.
  useEffect(() => {
    // Guard for a partial/absent socket (reconnect transitions, minimal mocks):
    // without a subscription we simply report no remote watchers.
    if (!socket || typeof socket.on !== 'function') return;
    const handle = (data: { usernames?: string[] }) => {
      setWatchers(Array.isArray(data?.usernames) ? data.usernames : []);
    };
    socket.on('lobbyAdWatchingUpdate', handle);
    return () => {
      socket.off('lobbyAdWatchingUpdate', handle);
    };
  }, [socket]);

  const anyAdActive = localAdActive || watchers.length > 0;
  return { anyAdActive, watchers };
}

export default useLobbyAdGate;
