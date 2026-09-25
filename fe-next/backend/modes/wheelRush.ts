/**
 * Wheel Rush — a letter wheel instead of a board (parallel discovery).
 */

import type { GameModeModule } from './types';
import { initWheelRushState, generateWheelPuzzle } from '../modules/wheelRushManager';
import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers';
import logger from '../utils/logger';

export const wheelRushMode: GameModeModule = {
  id: 'wheel-rush',

  initRound({ game, gameCode, language, playerUsernames }) {
    // Salted with gameSessionId (bumps every round) so a rematch gets a fresh wheel.
    const puzzle = generateWheelPuzzle(gameCode, language, game.gameSessionId ?? '');
    game.wheelRushState = initWheelRushState(puzzle, playerUsernames);
  },

  // Not in initRound: the client mounts WheelRushView only after startGame.
  // Late joiners / reconnects pull it with requestWheelRushState.
  afterStart(io, gameCode, game) {
    const state = game.wheelRushState;
    if (!state) {
      // Every submission would die on WHEEL_STATE_NOT_INITIALIZED with the round stuck at 0.
      logger.error('WHEEL_RUSH', `Game ${gameCode} in wheel-rush mode but wheelRushState missing after init`);
      return;
    }
    broadcastToRoom(io, getGameRoom(gameCode), 'wheelRushInit', { puzzle: state.puzzle, startedAt: state.startedAt });
  },

  resultsSummary(game) {
    return game.wheelRushState ? { wheelRushSummary: { playerStats: game.wheelRushState.playerStats ?? {} } } : {};
  },
};
