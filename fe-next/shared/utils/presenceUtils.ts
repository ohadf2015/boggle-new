/**
 * Presence Utilities
 * Shared logic for player presence updates
 */

// ==================== Types ====================

export interface Player {
  username: string;
  presenceStatus?: string;
  isWindowFocused?: boolean;
}

export interface PresenceUpdateData {
  username: string;
  presenceStatus?: string;
  isWindowFocused?: boolean;
}

// ==================== Handlers ====================

/**
 * Update player presence in the players list
 * Handles both string and object player formats
 */
export function updatePlayerPresence(
  players: Player[],
  data: PresenceUpdateData
): Player[] {
  if (!data || !data.username) {
    return players;
  }

  const { username: playerUsername, presenceStatus, isWindowFocused } = data;

  return players.map(player => {
    const name = typeof player === 'string' ? player : player.username;

    if (name === playerUsername) {
      const newPlayer: Player =
        typeof player === 'string'
          ? { username: player, presenceStatus, isWindowFocused }
          : { ...player, presenceStatus, isWindowFocused };
      return newPlayer;
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
