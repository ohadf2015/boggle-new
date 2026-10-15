/** Community word votes and peer-validation votes (split out of wordHandler). */

import type { Server, Socket } from 'socket.io';
import { getGame, getGameBySocketId, getUsernameBySocketId, recordPeerValidationVote } from '../modules/gameStateManager.js';
import { recordVote, updatePendingCache } from '../modules/communityWordManager.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import logger from '../utils/logger.js';
import { validatePayload, submitWordVoteSchema, submitPeerValidationVoteSchema } from '../utils/socketValidation.js';
import { handleWordBecameValid, handlePeerRejection, type PeerValidationResult } from './wordValidationHandler';

interface SubmitWordVotePayload {
  word: string;
  voteType: 'like' | 'dislike';
  gameCode?: string;
  submittedBy?: string;
}

interface SubmitPeerValidationVotePayload {
  word: string;
  isValid: boolean;
  gameCode?: string;
}

export function registerWordVoteHandlers(io: Server, socket: Socket): void {
  // Handle word vote submission (community validation)
  socket.on('submitWordVote', async (data: SubmitWordVotePayload) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    // Validate payload
    const validation = validatePayload(submitWordVoteSchema, data);
    if (!validation.success) {
      socket.emit('voteRecorded', { word: data?.word, success: false, error: 'Invalid request' });
      return;
    }

    try {
      const { word, voteType, gameCode: providedGameCode } = validation.data as SubmitWordVotePayload;
      const gameCode = providedGameCode || getGameBySocketId(socket.id);
      const username = getUsernameBySocketId(socket.id);

      if (!gameCode) {
        socket.emit('voteRecorded', { word, success: false, error: 'Not in a game' });
        return;
      }

      const game = getGame(gameCode);
      if (!game) {
        socket.emit('voteRecorded', { word, success: false, error: 'Game not found' });
        return;
      }
      if (!username) {
        socket.emit('voteRecorded', { word, success: false, error: 'Player not found' });
        return;
      }

      const userData = game.users?.[username];
      const userId = userData?.authUserId || null;
      const guestId = userData?.guestTokenHash || null;

      if (!userId && !guestId) {
        logger.debug('VOTE', `No voter identifier for ${username}`);
        socket.emit('voteRecorded', { word, success: false, error: 'No voter identity' });
        return;
      }

      const result = await recordVote({
        word,
        language: game.language || 'en',
        userId,
        guestId,
        gameCode,
        voteType,
        submitter: data.submittedBy || 'unknown',
        isBotWord: game.users?.[data.submittedBy || '']?.isBot === true
      });

      if (result.success) {
        updatePendingCache(word, game.language || 'en', voteType);
        socket.emit('voteRecorded', { word, success: true });
        logger.info('VOTE', `${username} voted ${voteType} on "${word}"`);

        if (result.isNowValid) {
          handleWordBecameValid(io, socket, game, gameCode, word, data.submittedBy);
        }
      } else {
        socket.emit('voteRecorded', { word, success: false, error: result.error });
      }
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('VOTE', `Error in submitWordVote handler: ${err.message}`, { stack: err.stack });
      socket.emit('voteRecorded', { word: data?.word, success: false, error: 'Vote failed' });
    }
  });

  // Handle peer validation vote for AI-approved words
  socket.on('submitPeerValidationVote', async (data: SubmitPeerValidationVotePayload) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    // Validate payload
    const validation = validatePayload(submitPeerValidationVoteSchema, data);
    if (!validation.success) {
      socket.emit('peerVoteRecorded', { word: data?.word, success: false, error: 'Invalid request' });
      return;
    }

    try {
      const { word, isValid, gameCode: providedGameCode } = validation.data as SubmitPeerValidationVotePayload;
      const gameCode = providedGameCode || getGameBySocketId(socket.id);
      const username = getUsernameBySocketId(socket.id);

      if (!gameCode) {
        socket.emit('peerVoteRecorded', { word, success: false, error: 'Not in a game' });
        return;
      }
      if (!username) {
        socket.emit('peerVoteRecorded', { word, success: false, error: 'Player not found' });
        return;
      }

      const game = getGame(gameCode);
      if (!game) {
        socket.emit('peerVoteRecorded', { word, success: false, error: 'Game not found' });
        return;
      }

      const result: PeerValidationResult = recordPeerValidationVote(gameCode, username, isValid);

      if (result.success) {
        socket.emit('peerVoteRecorded', {
          word,
          success: true,
          totalVotes: result.totalVotes,
          invalidVotes: result.invalidVotes
        });
        logger.info('PEER_VALIDATION', `${username} voted ${isValid ? 'valid' : 'invalid'} on "${word}"`);

        if (result.shouldReject) {
          handlePeerRejection(io, gameCode, game, result);
        }
      } else {
        socket.emit('peerVoteRecorded', { word, success: false, error: result.error });
      }
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('PEER_VALIDATION', `Error in submitPeerValidationVote: ${err.message}`, { stack: err.stack });
      socket.emit('peerVoteRecorded', { word: data?.word, success: false, error: 'Vote failed' });
    }
  });
}
