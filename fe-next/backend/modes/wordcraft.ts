/**
 * Wordcraft — live classroom race: every student crafts on their OWN
 * lesson-dealt board against a personal bot, and the room leaderboard
 * aggregates. There is no shared grid (the dealt board is a placeholder the
 * surfaces never render); the round clock, endGame and classroom summary are
 * the standard ones — only the session setup and the mount broadcast are
 * mode-specific.
 */

import type { GameMode } from '@/shared/types';
import type { GameModeModule } from './types';
import {
  ensureWordcraftPlayer,
  resolveWordcraftClassroomStart,
  wordcraftTargetsProgress,
} from '../modules/wordcraftClassroomManager';
import { WORDCRAFT_LIVE_EVENTS, type WordcraftLiveInit } from '@/shared/types/wordcraftLive';
import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers';
import logger from '../utils/logger';

export const wordcraftMode: GameModeModule = {
  id: 'wordcraft',

  initRound({ game, gameCode, language, playerUsernames, classroomGame }) {
    const start = resolveWordcraftClassroomStart({
      resolvedMode: 'wordcraft',
      classroomGame,
      gameCode,
      gameSessionId: game.gameSessionId ?? '',
      playerUsernames,
      language,
    });
    if (start.mode !== 'wordcraft') {
      // Crafted payload or a record that disagrees — the mode is classroom-only.
      logger.warn(
        'WORDCRAFT',
        `Game ${gameCode} asked for wordcraft but ${classroomGame ? 'the record says ' + classroomGame.settings?.gameMode : 'is not a classroom room'} — downgrading to ${start.mode}`,
      );
      return { downgradeTo: start.mode as GameMode };
    }
    game.wordcraftState = start.session;
    return undefined;
  },

  // Not in initRound: the client mounts its wordcraft surface only after
  // startGame. Late joiners / reconnects pull their own board with
  // wordcraft:requestState (the handler seats them on demand).
  afterStart(io, gameCode, game) {
    const state = game.wordcraftState;
    if (!state) {
      // Every placement would die with the round stuck at 0 — loud, not silent.
      logger.error('WORDCRAFT', `Game ${gameCode} in wordcraft mode but wordcraftState missing after init`);
      return;
    }
    broadcastToRoom(io, getGameRoom(gameCode), WORDCRAFT_LIVE_EVENTS.init, {
      gameCode,
      boardSize: state.boardSize,
      targets: state.targets,
    } satisfies WordcraftLiveInit);
  },

  onLateJoin(game, username) {
    if (game.wordcraftState) ensureWordcraftPlayer(game.wordcraftState, username);
  },

  resultsSummary(game) {
    return game.wordcraftState
      ? { wordcraftSummary: { targets: wordcraftTargetsProgress(game.wordcraftState) } }
      : {};
  },
};
