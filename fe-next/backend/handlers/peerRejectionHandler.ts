/** Peer rejection of an AI-approved word: claw back the score, record it, refresh the board. */

import type { Server } from 'socket.io';
import type { GameState } from '../modules/gameState/types.js';
import type { LeaderboardPlayer } from '../modules/scoreManager.js';
import { getLeaderboard, removePeerRejectedWordScore } from '../modules/gameStateManager.js';
import { broadcastToRoom, volatileBroadcastToRoom, getGameRoom } from '../utils/socketHelpers.js';
import { isSupabaseConfigured, recordPlayerWrongWord } from '../modules/supabaseServer.js';
import { addWordToBlacklist } from '../modules/botManager.js';
import logger from '../utils/logger.js';

export interface PeerValidationResult {
  success: boolean;
  error?: string;
  totalVotes?: number;
  invalidVotes?: number;
  validVotes?: number;
  shouldReject?: boolean;
  word?: string;
  submitter?: string;
  isBot?: boolean;
}

export function handlePeerRejection(io: Server, gameCode: string, game: GameState, result: PeerValidationResult): void {
  // Guard against missing word or submitter
  if (!result.word || !result.submitter) {
    logger.warn('PEER_VALIDATION', 'Missing word or submitter in peer rejection result');
    return;
  }

  // Type assertion after null checks
  const word: string = result.word;
  const submitter: string = result.submitter;

  const scoreRemoved = removePeerRejectedWordScore(gameCode, word, submitter);

  logger.info('PEER_VALIDATION', `Word "${word}" rejected. Removed ${scoreRemoved} from ${submitter}`);

  // Record rejected word for admin review (if not a bot word)
  if (!result.isBot && isSupabaseConfigured()) {
    recordPlayerWrongWord(word, game.language || 'en', 'peer_rejected').catch((err: Error) => {
      logger.error('WORD', `Failed to record peer-rejected word "${word}": ${err.message}`);
    });
  }

  // Blacklist bot words
  if (result.isBot && game.language) {
    addWordToBlacklist(word, game.language)
      .then((success: boolean) => {
        if (success) {
          logger.info('BOT', `Bot word "${word}" blacklisted for ${game.language}`);
        }
      })
      .catch((err: Error) => logger.warn('BOT', `Failed to blacklist: ${err.message}`));
  }

  broadcastToRoom(io, getGameRoom(gameCode), 'peerValidationResult', {
    word,
    submitter,
    rejected: true,
    invalidVotes: result.invalidVotes,
    validVotes: result.validVotes,
    scoreRemoved
  });

  const leaderboard: LeaderboardPlayer[] = getLeaderboard(gameCode);
  volatileBroadcastToRoom(io, getGameRoom(gameCode), 'updateLeaderboard', { leaderboard });
}
