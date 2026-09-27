/**
 * Player rename re-keying.
 *
 * When a player (guest OR host) changes their display name in the lobby, every
 * piece of in-game state keyed by their old username must move to the new key,
 * or it dangles. The `updateGuestName` handler historically migrated only
 * `users` + `playersReadyForNextGame` and rejected hosts outright — so a host
 * could never rename on the spot, and any other username-keyed map went stale.
 *
 * Rename is lobby-only (`gameState === 'waiting'`), so gameplay maps are empty
 * in practice. We still re-key the top-level username-keyed records here so the
 * migration stays correct if that guard is ever relaxed. The socket↔username
 * mapping is NOT touched here (it needs the socket id) — the handler owns that.
 */
import type { GameState } from './gameState/types';

/** Move `rec[oldName]` → `rec[newName]` if present. No-op for absent maps. */
function rekeyRecord<T>(rec: Record<string, T> | undefined, oldName: string, newName: string): void {
  if (!rec) return;
  if (Object.prototype.hasOwnProperty.call(rec, oldName)) {
    rec[newName] = rec[oldName];
    delete rec[oldName];
  }
}

/**
 * Re-key all lobby/game state from `oldName` to `newName`, mutating `game` in
 * place. Safe to call for both guests and the host.
 */
export function renamePlayerInGame(game: GameState, oldName: string, newName: string): void {
  if (oldName === newName) return;

  // Primary user record — preserve all fields (incl. isHost), update username.
  const user = game.users[oldName];
  if (user) {
    game.users[newName] = { ...user, username: newName };
    delete game.users[oldName];
  }

  // Host identity — load-bearing for reconnect restore, kick-protection,
  // boost allocation at game start, and host-leave detection.
  if (game.hostUsername === oldName) {
    game.hostUsername = newName;
  }

  // Top-level username-keyed records.
  rekeyRecord(game.playersReadyForNextGame, oldName, newName);
  rekeyRecord(game.playerScores, oldName, newName);
  rekeyRecord(game.playerWords, oldName, newName);
  rekeyRecord(game.playerAchievements, oldName, newName);
  rekeyRecord(game.playerCombos, oldName, newName);
  rekeyRecord(game.peerValidationVotes, oldName, newName);
  rekeyRecord(game.playerWordDetails, oldName, newName);
  rekeyRecord(game.playerWordsSet, oldName, newName);
  rekeyRecord(game.playerBoosts, oldName, newName);

  // Lobby chat history shows the display name on each message.
  if (game.chatHistory) {
    for (const entry of game.chatHistory) {
      if (entry.username === oldName) entry.username = newName;
    }
  }
}
