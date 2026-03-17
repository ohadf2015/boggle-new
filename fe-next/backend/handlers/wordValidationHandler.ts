/**
 * Word Validation Handler
 * Handles validated word processing, community validation, and peer rejection
 */

import type { Server, Socket } from 'socket.io';
import type { WordDetail } from '@/shared/types';
import type { GameState } from '../modules/gameState/types.js';
import type { LeaderboardPlayer } from '../modules/scoreManager.js';

import {
  addPlayerWord,
  updatePlayerScore,
  getLeaderboard,
  recordFirstFinder,
  removePeerRejectedWordScore,
} from '../modules/gameStateManager.js';

import { broadcastToRoom, getGameRoom, getSocketById, safeEmit } from '../utils/socketHelpers.js';
import { calculateWordScore } from '../modules/scoringEngine.js';
import { checkAndAwardAchievements } from '../modules/achievementManager.js';
import { isSupabaseConfigured, savePlayerWord, recordPlayerWrongWord } from '../modules/supabaseServer.js';
import { addWordToBlacklist } from '../modules/botManager.js';
import { inc, incPerGame } from '../utils/metrics.js';
import logger from '../utils/logger.js';
import { processLongWordEngagement } from './engagementHandler';
import { calculateBlastTileBonus, getTilesOnPath, recordBlastMove } from '../modules/blastModeManager.js';
import { restoreLife, getLifeBonus, computeDiscoveryClues } from '../modules/wordHuntManager.js';

interface Achievement {
  key: string;
  icon: string;
}

interface PeerValidationResult {
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

function handleValidatedWord(io: Server, socket: Socket, game: GameState, gameCode: string, username: string, normalizedWord: string, isInDictionary: boolean, comboType?: string | null): void {
  // Derive combo and fire round from server state (never trust client)
  const safeComboLevel = game.playerCombos?.[username] || 0;
  const fireRoundActive = game.fireRoundActive === true;
  const fireRoundMultiplier = fireRoundActive ? 2 : 1;
  const baseScore = normalizedWord.length - 1;
  const wordScore = calculateWordScore(normalizedWord, safeComboLevel, fireRoundMultiplier);
  // Calculate combo bonus without fire round multiplier for display purposes
  const scoreWithoutMultiplier = calculateWordScore(normalizedWord, safeComboLevel, 1);
  const comboBonus = scoreWithoutMultiplier - baseScore;
  // Fire round bonus is the additional points from the 2x multiplier
  const fireRoundBonus = fireRoundActive ? scoreWithoutMultiplier : 0;

  // Increment server-side combo on each accepted word
  if (!game.playerCombos) game.playerCombos = {};
  game.playerCombos[username] = safeComboLevel + 1;

  // Record this player as the first finder of this word
  const userData = game.users?.[username];
  recordFirstFinder(gameCode, normalizedWord, username, userData?.avatar ?? undefined);

  // Check if word is from lesson vocabulary (classroom games)
  const fromLesson = game.lessonVocabulary?.has(normalizedWord.toUpperCase()) || false;

  // Calculate blast mode tile bonus BEFORE storing word details so the stored
  // score includes tile bonuses (used by scoringEngine for final results).
  let blastTileBonus = 0;
  let blastTilesCleared: string[] = [];
  let blastMoveResult: { movesUsed: number; bonusMove: boolean } | null = null;

  if (game.gameMode === 'blast' && game.blastModeState) {
    try {
      const blastState = game.blastModeState;
      const tilesOnPath = getTilesOnPath(normalizedWord, game.letterPositions || new Map(), blastState.overlay, blastState.overlayMap);
      blastTileBonus = calculateBlastTileBonus(tilesOnPath);
      blastTilesCleared = tilesOnPath;
      const gemCount = tilesOnPath.filter(t => t === 'gem').length;
      blastMoveResult = recordBlastMove(blastState, username, safeComboLevel, normalizedWord, tilesOnPath.length, gemCount, blastTileBonus);
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('BLAST', `Blast bonus calculation error: ${error.message}`);
      blastTileBonus = 0;
    }
  }

  addPlayerWord(gameCode, username, normalizedWord, {
    autoValidated: true,
    score: wordScore + blastTileBonus,
    comboBonus: comboBonus,
    comboLevel: safeComboLevel,
    fireRoundMultiplier: fireRoundMultiplier,
    fireRoundBonus: fireRoundBonus,
    fromLesson: fromLesson
  });

  // Save to database if dictionary word
  if (isInDictionary && isSupabaseConfigured()) {
    savePlayerWord({
      word: normalizedWord,
      language: game.language || 'en',
      gameCode,
      playerId: userData?.authUserId || null
    }).catch((err: Error) => {
      logger.debug('PLAYER_WORDS', `Failed to save player word: ${err.message}`);
    });
  }

  // Single atomic score update: word score + blast tile bonus (if any)
  updatePlayerScore(gameCode, username, wordScore + blastTileBonus, true);

  inc('wordAccepted');
  incPerGame(gameCode, 'wordAccepted');

  socket.emit('wordAccepted', {
    word: normalizedWord,
    score: wordScore,
    baseScore: baseScore,
    comboBonus: comboBonus,
    comboLevel: safeComboLevel,
    fireRoundActive: fireRoundActive,
    fireRoundMultiplier: fireRoundMultiplier,
    fireRoundBonus: fireRoundBonus,
    autoValidated: true,
    fromLesson: fromLesson,
    // Merged blast data (Fix 2): includes tile bonus, moves, combo info in single emit
    ...(blastMoveResult ? {
      blast: {
        tileBonus: blastTileBonus,
        tilesCleared: blastTilesCleared,
        movesUsed: blastMoveResult.movesUsed,
        bonusMove: blastMoveResult.bonusMove,
        comboType: comboType ?? null,
      },
    } : {}),
  });

  // Restore life in word-hunt mode when a word is accepted
  if (game.gameMode === 'word-hunt' && game.wordHuntState) {
    try {
      // wordHuntManager imported at top level
      const huntState = game.wordHuntState;
      const lifeBonus = getLifeBonus(normalizedWord.length);
      restoreLife(huntState, username, lifeBonus);
      // Broadcast updated lives immediately so clients don't wait for next timer tick
      broadcastToRoom(io, getGameRoom(gameCode), 'wordHuntLifeUpdate', {
        playerLives: huntState.playerLives,
        eliminatedPlayers: huntState.eliminatedPlayers,
      });
      // Mark last broadcast time so gameTimer skips the redundant tick broadcast
      huntState.lastLifeUpdateAt = Date.now();

      // Compute discovery clues — sent only to the player who found the word (competitive)
      const gameStartedAt = game.gameStartedAt || 0;
      const elapsed = Date.now() - gameStartedAt;
      const CLUE_DELAY = 15_000; // 15s before clues start
      const CLUE_THROTTLE = 5_000; // 5s between clue broadcasts per player

      if (elapsed >= CLUE_DELAY) {
        const clues = computeDiscoveryClues(huntState.targetWord, normalizedWord);
        if (clues.greenPositions.length > 0 || clues.knownLetters.length > 0) {
          // Per-player throttle: don't flood clues
          if (!huntState.lastClueAt) huntState.lastClueAt = {};
          const lastClue = huntState.lastClueAt[username] || 0;
          if (Date.now() - lastClue >= CLUE_THROTTLE) {
            huntState.lastClueAt[username] = Date.now();
            huntState.discoveryWordCount = (huntState.discoveryWordCount || 0) + 1;
            // Send only to the submitting player, not the whole room
            socket.emit('wordHuntDiscoveryClues', {
              word: normalizedWord,
              greenPositions: clues.greenPositions,
              knownLetters: clues.knownLetters,
            });
          }
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('WORD_HUNT', `Life restoration error: ${error.message}`);
    }
  }

  // Broadcast playerFoundWord to room for TV broadcast mode
  // Includes combo level and word for exciting notifications
  const totalScore = (game.playerScores?.[username] || 0) + wordScore;
  const playerWordCount = (game.playerWords?.[username]?.length || 0) + 1;
  broadcastToRoom(io, getGameRoom(gameCode), 'playerFoundWord', {
    username: username,
    word: normalizedWord,
    wordCount: playerWordCount,
    score: totalScore,
    comboLevel: safeComboLevel,
    // Merged combo sync (Fix 2): combo type embedded in playerFoundWord instead of separate event
    ...(comboType ? { comboSync: { comboType, username } } : {}),
  });

  // Check achievements
  const achievements: Achievement[] = checkAndAwardAchievements(gameCode, username, normalizedWord);
  if (achievements.length > 0) {
    logger.info('ACHIEVEMENT', `Emitting liveAchievementUnlocked to ${username}: ${achievements.map(a => a.key).join(', ')} (gameState: ${game.gameState})`);
    socket.emit('liveAchievementUnlocked', { achievements });
  }

  // Process long word engagement (8+ letters triggers mystery reward chance)
  if (normalizedWord.length >= 8) {
    if (userData?.authUserId) {
      processLongWordEngagement(socket, userData.authUserId, normalizedWord, gameCode)
        .catch((err: Error) => logger.debug('ENGAGEMENT', `Long word engagement error: ${err.message}`));
    }
  }
}

function handleWordBecameValid(io: Server, _socket: Socket, game: GameState, gameCode: string, word: string, submitter?: string): void {
  if (submitter && game.playerWordDetails?.[submitter]) {
    const wordDetails = game.playerWordDetails[submitter] as WordDetail[];
    const wordDetail = wordDetails.find((wd: WordDetail) => wd.word === word);
    if (wordDetail && wordDetail.validated !== true) {
      const potentialScore = wordDetail.score || calculateWordScore(word, wordDetail.comboLevel || 0);

      wordDetail.validated = true;
      wordDetail.validatedByCommunity = true;

      // Use atomic delta increment to avoid race conditions with concurrent score updates
      updatePlayerScore(gameCode, submitter, potentialScore, true);
      const newScore = game.playerScores?.[submitter] || 0;

      logger.info('VOTE', `Word "${word}" validated! Awarding ${potentialScore} to ${submitter}`);

      const submitterData = game.users?.[submitter];
      if (submitterData?.socketId) {
        const submitterSocket = getSocketById(io, submitterData.socketId);
        if (submitterSocket) {
          safeEmit(submitterSocket, 'wordValidatedByVotes', {
            word,
            score: potentialScore,
            newTotalScore: newScore
          });
        }
      }
    }
  }

  broadcastToRoom(io, getGameRoom(gameCode), 'wordBecameValid', {
    word,
    language: game.language || 'en'
  });
}

function handlePeerRejection(io: Server, gameCode: string, game: GameState, result: PeerValidationResult): void {
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
    recordPlayerWrongWord(word, game.language || 'en', 'peer_rejected').catch(() => {});
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
  broadcastToRoom(io, getGameRoom(gameCode), 'updateLeaderboard', { leaderboard });
}

export { handleValidatedWord, handleWordBecameValid, handlePeerRejection };
export type { PeerValidationResult, Achievement };
