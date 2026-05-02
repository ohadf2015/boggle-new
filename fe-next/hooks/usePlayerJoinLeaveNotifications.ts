import { useEffect, useRef } from 'react';
import { neoInfoToast, neoWarningToast, TOAST_ICONS } from '@/components/NeoToast';
import { midRoundEventQueueStore } from './useMidRoundEventQueue';

interface Player {
  username: string;
  isBot?: boolean;
  [key: string]: unknown;
}

interface UsePlayerJoinLeaveNotificationsProps {
  players: Player[];
  currentUsername: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  enabled?: boolean;
  /**
   * When true (active competitive round), suppress toasts and append
   * each join/leave to the mid-round event queue for post-round summary.
   * Avoids breaking player focus during gameplay.
   */
  deferToQueue?: boolean;
}

// Single shared toast slot for ALL room presence events (joins/leaves/bots).
// Reusing one id makes react-hot-toast replace any visible toast with the
// next one — only one is on-screen at a time, behaving like a 1-deep queue.
const ROOM_TOAST_ID = 'mp-room-presence';
const ROOM_TOAST_DURATION = 2200;

/**
 * Shows toast notifications when players join or leave the multiplayer lobby.
 * Diffs the player list on each update to detect changes.
 * Batches multiple bot joins into a single consolidated toast.
 *
 * All emitted toasts share a single id so at most one is visible at a time —
 * a new arrival/departure replaces the prior message rather than stacking.
 */
export function usePlayerJoinLeaveNotifications({
  players,
  currentUsername,
  t,
  enabled = true,
  deferToQueue = false,
}: UsePlayerJoinLeaveNotificationsProps) {
  const prevUsernamesRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    const currentUsernames = new Set(players.map((p) => p.username));
    const botUsernames = new Set(players.filter((p) => p.isBot).map((p) => p.username));

    // Skip first render — don't announce existing players
    if (prevUsernamesRef.current === null) {
      prevUsernamesRef.current = currentUsernames;
      return;
    }

    if (!enabled) {
      prevUsernamesRef.current = currentUsernames;
      return;
    }

    const prev = prevUsernamesRef.current;

    // Detect joins — separate bots from humans
    const newHumans: string[] = [];
    const newBots: string[] = [];
    for (const name of currentUsernames) {
      if (!prev.has(name) && name !== currentUsername) {
        if (botUsernames.has(name)) {
          newBots.push(name);
        } else {
          newHumans.push(name);
        }
      }
    }

    // Detect leaves
    const leavers: string[] = [];
    for (const name of prev) {
      if (!currentUsernames.has(name) && name !== currentUsername) {
        leavers.push(name);
      }
    }

    if (deferToQueue) {
      // Mid-round: enqueue each event for post-round summary; never toast
      const enqueue = midRoundEventQueueStore.getState().enqueue;
      for (const name of newHumans) {
        enqueue({ kind: 'playerJoined', payload: { username: name, isBot: false } });
      }
      for (const name of newBots) {
        enqueue({ kind: 'playerJoined', payload: { username: name, isBot: true } });
      }
      for (const name of leavers) {
        enqueue({ kind: 'playerLeft', payload: { username: name } });
      }
    } else {
      // Lobby/results: toast as before
      for (const name of newHumans) {
        neoInfoToast(`${name} ${t('multiplayer.playerJoined')}`, {
          icon: '👋',
          duration: ROOM_TOAST_DURATION,
          id: ROOM_TOAST_ID,
        });
      }
      if (newBots.length > 0) {
        neoInfoToast(t('multiplayer.botsJoined', { count: newBots.length }), {
          icon: TOAST_ICONS.gamepad,
          duration: ROOM_TOAST_DURATION,
          id: ROOM_TOAST_ID,
        });
      }
      for (const name of leavers) {
        neoWarningToast(`${name} ${t('multiplayer.playerLeft')}`, {
          icon: '🚪',
          duration: ROOM_TOAST_DURATION,
          id: ROOM_TOAST_ID,
        });
      }
    }

    prevUsernamesRef.current = currentUsernames;
  }, [players, currentUsername, t, enabled, deferToQueue]);
}
