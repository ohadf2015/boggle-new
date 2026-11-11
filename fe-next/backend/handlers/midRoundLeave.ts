import type { Server } from 'socket.io';
import type { GameState } from '../modules/gameState/types.js';
import { clearSocketMappingsForLeave, removeUserFromGame } from '../modules/gameStateManager.js';
import { notifyRivalLeft } from '../modules/rivalSocket.js';
import timerManager from '../utils/timerManager.js';
import gameStartCoordinator from '../utils/gameStartCoordinator.js';
import { startGameTimer } from '../services/gameLifecycle/gameTimer.js';

/** An explicit Exit during or after a round: drop the seat for good, not the reconnect-grace path a transport drop takes. */
export function removeMidRoundLeaver(io: Server, gameCode: string, game: GameState, socketId: string, username: string): void {
  timerManager.clearTimer(`reconnect:${gameCode}:${username}`);
  const coord = gameStartCoordinator.handlePlayerDisconnect(gameCode, username);
  if (coord && coord.startTimer) startGameTimer(io, gameCode, game.gameDuration || game.timerSeconds || 180);
  notifyRivalLeft(gameCode, game, username);
  clearSocketMappingsForLeave(socketId, gameCode, username);
  removeUserFromGame(gameCode, username);
}
