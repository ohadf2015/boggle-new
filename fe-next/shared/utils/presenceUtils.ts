/**
 * Presence Utilities
 * Shared logic for player presence updates
 */

import type { Player } from '@/hooks/useGameState';

// ==================== Types ====================

export interface PresenceUpdateData {
  username: string;
  presenceStatus?: string;
  isWindowFocused?: boolean;
}

// ==================== Handlers ====================

/**
 * Update player presence in the players list
 * Preserves all existing player properties while updating presence
 * Maps presenceStatus to the presence field expected by Player type
 */
export function updatePlayerPresence(
  players: Player[],
  data: PresenceUpdateData
): Player[] {
  if (!data || !data.username) {
    return players;
  }

  const { username: playerUsername, presenceStatus } = data;

  return players.map(player => {
    if (player.username === playerUsername) {
      // Preserve all existing properties, map presenceStatus to presence
      const updates: Partial<Player> = {};
      if (presenceStatus === 'active' || presenceStatus === 'idle' || presenceStatus === 'afk') {
        updates.presence = presenceStatus;
      }

      return {
        ...player,
        ...updates,
      };
    }

    return player;
  });
}

/**
 * Create a handler for player presence update events
 */
export function createPlayerPresenceHandler(
  setPlayersReady: React.Dispatch<React.SetStateAction<Player[]>>
): (data: PresenceUpdateData) => void {
  return (data: PresenceUpdateData) => {
    setPlayersReady(prev => updatePlayerPresence(prev, data));
  };
}
