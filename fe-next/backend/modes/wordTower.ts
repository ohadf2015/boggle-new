/**
 * Word Tower (beta) — per-player towers in a versus match.
 */

import type { GameModeModule } from './types';
import { addVersusPlayer, initVersusMatch, versusStandings } from '@/lib/wordTower/versusMatch';
import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers';

export const wordTowerMode: GameModeModule = {
  id: 'word-tower',

  initRound({ game, gameCode, language, playerUsernames }) {
    game.wordTowerVersusState = initVersusMatch(
      gameCode,
      language,
      playerUsernames.filter((u) => !game.users[u]?.isBot).map((u) => ({ id: u, username: u })),
      Date.now(),
    );
  },

  // Beats the requestTowerState race: the versus hook polls on mount, during
  // the countdown, before the match exists.
  afterStart(io, gameCode) {
    broadcastToRoom(io, getGameRoom(gameCode), 'towerMatchReady', {});
  },

  onLateJoin(game, username) {
    if (game.wordTowerVersusState) {
      game.wordTowerVersusState = addVersusPlayer(game.wordTowerVersusState, { id: username, username });
    }
  },

  // Height is the score; banked words only feed quests/XP.
  rankResults(scores, game) {
    const match = game.wordTowerVersusState;
    if (!match) return scores;
    const height = new Map(versusStandings(match).map((s) => [s.username, Math.round(s.heightM)]));
    return scores
      .map((s) => ({ ...s, totalScore: height.get(s.username) ?? 0 }))
      .sort((a, b) => b.totalScore - a.totalScore);
  },
};
