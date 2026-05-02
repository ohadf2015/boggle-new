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
const ROOM_TOAST_DURATION = 1500;

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
      // Lobby/results: ONE consolidated toast per batch (joins, leaves) so
      // iOS doesn't flash through a rapid sequence of single-name toasts.
      const joinTotal = newHumans.length + newBots.length;
      if (joinTotal > 0) {
        const joinMessage = buildJoinMessage(newHumans, newBots, t);
        neoInfoToast(joinMessage, {
          icon: newHumans.length > 0 ? '👋' : TOAST_ICONS.gamepad,
          duration: ROOM_TOAST_DURATION,
          id: ROOM_TOAST_ID,
        });
      }
      if (leavers.length > 0) {
        const leaveMessage = buildLeaveMessage(leavers, t);
        neoWarningToast(leaveMessage, {
          icon: '🚪',
          duration: ROOM_TOAST_DURATION,
          id: ROOM_TOAST_ID,
        });
      }
    }

    prevUsernamesRef.current = currentUsernames;
  }, [players, currentUsername, t, enabled, deferToQueue]);
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

function buildJoinMessage(humans: string[], bots: string[], t: Translate): string {
  // Single human alone → keep classic personal text "Bob joined the game!"
  if (humans.length === 1 && bots.length === 0) {
    return `${humans[0]} ${t('multiplayer.playerJoined')}`;
  }
  // Bots only → existing botsJoined translation handles the count
  if (humans.length === 0 && bots.length > 0) {
    return t('multiplayer.botsJoined', { count: bots.length });
  }
  // Mixed batch → list the humans + suffix bot count
  const total = humans.length + bots.length;
  if (humans.length === 0) {
    return t('multiplayer.playersJoinedCount', { count: total });
  }
  // 1-3 humans → list names; 4+ → "Bob, Carol +N more"
  const namesPart = humans.length <= 3
    ? humans.join(', ')
    : `${humans.slice(0, 2).join(', ')} +${humans.length - 2}`;
  if (bots.length === 0) {
    return `${namesPart} ${t('multiplayer.playerJoined')}`;
  }
  return `${namesPart} +${bots.length} 🤖 ${t('multiplayer.playerJoined')}`;
}

function buildLeaveMessage(leavers: string[], t: Translate): string {
  if (leavers.length === 1) {
    return `${leavers[0]} ${t('multiplayer.playerLeft')}`;
  }
  const namesPart = leavers.length <= 3
    ? leavers.join(', ')
    : `${leavers.slice(0, 2).join(', ')} +${leavers.length - 2}`;
  return `${namesPart} ${t('multiplayer.playerLeft')}`;
}
