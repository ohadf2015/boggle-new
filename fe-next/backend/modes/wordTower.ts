/**
 * Word Tower (beta) — per-player towers in a versus match.
 */

import type { GameModeModule } from './types';
import { initVersusMatch } from '@/lib/wordTower/versusMatch';
import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers';

export const wordTowerMode: GameModeModule = {
  id: 'word-tower',

  initRound({ game, gameCode, language, playerUsernames }) {
    game.wordTowerVersusState = initVersusMatch(
      gameCode,
      language,
      playerUsernames.map((u) => ({ id: u, username: u })),
      Date.now(),
    );
  },

  // Beats the requestTowerState race: the versus hook polls on mount, during
  // the countdown, before the match exists.
  afterStart(io, gameCode) {
    broadcastToRoom(io, getGameRoom(gameCode), 'towerMatchReady', {});
  },
};
