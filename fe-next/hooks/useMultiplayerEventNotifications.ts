import { useEffect, useRef } from 'react';
import { useGameStore } from '@/hooks/gameState/store';
import { neoWarningToast, neoErrorToast } from '@/components/NeoToast';

interface UseMultiplayerEventNotificationsProps {
  currentUsername: string;
  t: (key: string) => string;
  enabled: boolean;
}

const LAST_LIFE_THRESHOLD = 1;

/**
 * Watches Zustand game state for multiplayer events (eliminations, last-life)
 * and fires dramatic toast notifications.
 */
export function useMultiplayerEventNotifications({
  currentUsername,
  t,
  enabled,
}: UseMultiplayerEventNotificationsProps) {
  const notifiedEliminationsRef = useRef<Set<string>>(new Set());
  const notifiedLastLifeRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const eliminatedPlayers = useGameStore((s) => s.wordHuntEliminatedPlayers);
  const playerLives = useGameStore((s) => s.wordHuntPlayerLives);

  // Track eliminations
  useEffect(() => {
    // Skip initial render to avoid notifying about pre-existing state
    if (!initializedRef.current) {
      // Seed with current state so we don't notify on mount
      for (const name of eliminatedPlayers) {
        notifiedEliminationsRef.current.add(name);
      }
      for (const [name, lives] of Object.entries(playerLives)) {
        if (lives <= LAST_LIFE_THRESHOLD) {
          notifiedLastLifeRef.current.add(name);
        }
      }
      initializedRef.current = true;
      return;
    }

    if (!enabled) return;

    // Detect new eliminations
    for (const name of eliminatedPlayers) {
      if (notifiedEliminationsRef.current.has(name)) continue;
      notifiedEliminationsRef.current.add(name);

      if (name === currentUsername) {
        neoErrorToast(t('multiplayer.youEliminated'), {
          icon: '💀',
          duration: 5000,
        });
      } else {
        neoWarningToast(`${name} ${t('multiplayer.playerEliminated')}`, {
          icon: '💀',
          duration: 4000,
        });
      }
    }
  }, [eliminatedPlayers, playerLives, enabled, currentUsername, t]);

  // Track last-life warnings
  useEffect(() => {
    if (!initializedRef.current || !enabled) return;

    for (const [name, lives] of Object.entries(playerLives)) {
      if (lives > LAST_LIFE_THRESHOLD) continue;
      if (notifiedLastLifeRef.current.has(name)) continue;
      notifiedLastLifeRef.current.add(name);

      if (name === currentUsername) {
        neoErrorToast(t('multiplayer.yourLastLife'), {
          icon: '❤️',
          duration: 4000,
        });
      } else {
        neoWarningToast(`${name} ${t('multiplayer.playerLastLife')}`, {
          icon: '❤️',
          duration: 3000,
        });
      }
    }
  }, [playerLives, enabled, currentUsername, t]);
}
