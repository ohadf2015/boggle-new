/**
 * Post-credit effects shared by every way a board word scores (full credit and
 * second-finder confirmation), so neither path forgets one.
 */

import type { Server, Socket } from 'socket.io';
import type { GameState } from '../modules/gameState/types.js';
import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers.js';
import { restoreLife, getLifeBonus, computeDiscoveryClues } from '../modules/wordHuntManager.js';
import logger from '../utils/logger.js';

const CLUE_DELAY_MS = 15_000;
const CLUE_THROTTLE_MS = 5_000;

export function bumpServerSeq(game: GameState): number {
  game.serverSeq = (game.serverSeq ?? 0) + 1;
  return game.serverSeq;
}

/** Word Hunt: an accepted word restores life (broadcast now, not on the next tick) and may earn the finder a clue. */
export function applyWordHuntWordEffects(io: Server, socket: Socket, game: GameState, gameCode: string, username: string, word: string): void {
  if (game.gameMode !== 'word-hunt' || !game.wordHuntState) return;
  try {
    const huntState = game.wordHuntState;
    restoreLife(huntState, username, getLifeBonus(word.length));
    broadcastToRoom(io, getGameRoom(gameCode), 'wordHuntLifeUpdate', {
      playerLives: huntState.playerLives,
      eliminatedPlayers: huntState.eliminatedPlayers,
    });
    huntState.lastLifeUpdateAt = Date.now();

    const elapsed = Date.now() - (game.gameStartedAt || 0);
    if (elapsed < CLUE_DELAY_MS) return;
    const clues = computeDiscoveryClues(huntState.targetWord, word);
    if (clues.greenPositions.length === 0 && clues.knownLetters.length === 0) return;
    if (!huntState.lastClueAt) huntState.lastClueAt = {};
    if (Date.now() - (huntState.lastClueAt[username] || 0) < CLUE_THROTTLE_MS) return;
    huntState.lastClueAt[username] = Date.now();
    huntState.discoveryWordCount = (huntState.discoveryWordCount || 0) + 1;
    socket.emit('wordHuntDiscoveryClues', {
      word,
      greenPositions: clues.greenPositions,
      knownLetters: clues.knownLetters,
    });
  } catch (err: unknown) {
    logger.error('WORD_HUNT', `Life restoration error: ${(err as Error).message}`);
  }
}
