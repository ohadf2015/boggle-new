/**
 * Second-finder ("confirmation") credit: half the base score for a word
 * someone else found first, where the mode's duplicate rule applies.
 */

import type { Server, Socket } from 'socket.io';
import type { GameState } from '../modules/gameState/types.js';
import type { FirstFinderEntry } from '@/shared/types/game';
import { updatePlayerScore, addPlayerWord } from '../modules/gameStateManager.js';
import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers.js';
import { calculateWordScore } from '../modules/scoringEngine.js';
import { isDuplicateRuleDisabled } from '../modes/rules';
import { hitRoomBoss } from '../services/classroomBoss/roomBoss.js';
import { advanceServerCombo } from '../modules/comboDecay';
import { ensurePlayerState } from './playerDataInit';
import { applyWordHuntWordEffects, bumpServerSeq } from './wordCreditEffects';

/** Blast boards are per-player, and big rooms / shared-word modes pay duplicates in full. */
export function duplicateHalvingApplies(game: GameState): boolean {
  if (game.gameMode === 'blast') return false;
  return !isDuplicateRuleDisabled(game.gameMode, Object.keys(game.users || {}).length);
}

export function handleConfirmationWord(
  io: Server,
  socket: Socket,
  game: GameState,
  gameCode: string,
  username: string,
  word: string,
  firstFinder: FirstFinderEntry,
  inputMethod: 'kb' | 'drag',
): void {
  const baseScore = calculateWordScore(word, 0, 1, 1, { inputMethod });
  const confirmationScore = Math.floor(baseScore * 0.5);

  if (confirmationScore > 0) {
    updatePlayerScore(gameCode, username, confirmationScore, true);
    addPlayerWord(gameCode, username, word, {
      score: confirmationScore,
      validated: true,
      autoValidated: true,
    });
  }

  // Boss rounds are co-op: a second finder still lands a (half-strength) hit.
  const boss = hitRoomBoss(io, gameCode, game, { username, word, score: confirmationScore });
  socket.emit('wordAlreadyFoundByOther', {
    word,
    foundBy: firstFinder.username,
    foundByAvatar: firstFinder.avatar || null,
    confirmationScore,
    ...(boss ? { boss } : {}),
  });

  ensurePlayerState(game, username);
  advanceServerCombo(game, username);

  const serverSeq = bumpServerSeq(game);
  broadcastToRoom(io, getGameRoom(gameCode), 'scoreUpdate', {
    serverSeq,
    username,
    deltaScore: confirmationScore,
    totalScore: game.playerScores?.[username] ?? 0,
    lastWord: word,
    lastWordScore: confirmationScore,
  });

  applyWordHuntWordEffects(io, socket, game, gameCode, username, word);
}
