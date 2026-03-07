import { useEffect, useRef } from 'react';
import { neoInfoToast, neoWarningToast } from '@/components/NeoToast';

interface Player {
  username: string;
  [key: string]: unknown;
}

interface UsePlayerJoinLeaveNotificationsProps {
  players: Player[];
  currentUsername: string;
  t: (key: string) => string;
  enabled?: boolean;
}

/**
 * Shows toast notifications when players join or leave the multiplayer lobby.
 * Diffs the player list on each update to detect changes.
 */
export function usePlayerJoinLeaveNotifications({
  players,
  currentUsername,
  t,
  enabled = true,
}: UsePlayerJoinLeaveNotificationsProps) {
  const prevUsernamesRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    const currentUsernames = new Set(players.map((p) => p.username));

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

    // Detect joins
    for (const name of currentUsernames) {
      if (!prev.has(name) && name !== currentUsername) {
        neoInfoToast(`${name} ${t('multiplayer.playerJoined')}`, {
          icon: '👋',
          duration: 3000,
        });
      }
    }

    // Detect leaves
    for (const name of prev) {
      if (!currentUsernames.has(name) && name !== currentUsername) {
        neoWarningToast(`${name} ${t('multiplayer.playerLeft')}`, {
          icon: '🚪',
          duration: 3000,
        });
      }
    }

    prevUsernamesRef.current = currentUsernames;
  }, [players, currentUsername, t, enabled]);
}
