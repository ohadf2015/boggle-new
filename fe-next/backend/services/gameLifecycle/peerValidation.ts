/**
 * Peer Validation Service
 *
 * Handles peer validation workflow for AI-approved words after game ends.
 * Players vote on whether AI-approved words are valid.
 */

import type { Server } from 'socket.io';
import type { GameState } from '../../modules/gameState/types';
import {
  selectWordForPeerValidation,
} from '../../modules/gameStateManager';
import { getSocketById, safeEmit } from '../../utils/socketHelpers';
import logger from '../../utils/logger';

const PEER_VALIDATION_TIMEOUT_SECONDS = 20;

/**
 * Handle peer validation for AI-approved words
 * Sends validation requests to players (excluding the word submitter)
 */
export function handlePeerValidation(
  io: Server,
  gameCode: string,
  game: GameState,
  playerCount: number
): void {
  const aiApprovedWords = game.aiApprovedWords || [];

  // Only trigger peer validation if:
  // - There are AI-approved words
  // - At least 4 players (enough for meaningful voting)
  if (aiApprovedWords.length > 0 && playerCount >= 4) {
    const selectedWord = selectWordForPeerValidation(gameCode);

    if (selectedWord) {
      logger.info(
        'PEER_VALIDATION',
        `Game ${gameCode}: Selected "${selectedWord.word}" for peer validation`
      );

      // Delay by 1 second to allow results screen to render
      setTimeout(() => {
        for (const [username, userData] of Object.entries(game.users) as [
          string,
          { socketId: string; avatar?: { emoji: string; color: string } }
        ][]) {
          // Skip the submitter - they shouldn't vote on their own word
          if (username === selectedWord.submitter) continue;

          const playerSocket = getSocketById(io, userData.socketId);
          if (playerSocket) {
            safeEmit(playerSocket, 'peerValidationRequest', {
              word: selectedWord.word,
              submittedBy: selectedWord.submitter,
              submitterAvatar: game.users[selectedWord.submitter]?.avatar || null,
              confidence: selectedWord.confidence,
              timeoutSeconds: PEER_VALIDATION_TIMEOUT_SECONDS,
              gameCode,
              language: game.language || 'en',
            });
          }
        }
      }, 1000);
    }
  }
}
