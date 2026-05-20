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
  getGame,
} from '../modules/gameStateManager.js';

import { broadcastToRoom, broadcastToRoomExceptSender, volatileBroadcastToRoom, getGameRoom, getSocketById, safeEmit } from '../utils/socketHelpers.js';
import { calculateWordScore } from '../modules/scoringEngine.js';
import { checkAndAwardAchievements } from '../modules/achievementManager.js';
import { isSupabaseConfigured, savePlayerWord, recordPlayerWrongWord } from '../modules/supabaseServer.js';
import { addWordToBlacklist, getGameBots, resyncBotsForNewGrid } from '../modules/botManager.js';
import { inc, incPerGame } from '../utils/metrics.js';
import logger from '../utils/logger.js';
import { processLongWordEngagement } from './engagementHandler';
import { calculateBlastTileBonus, getTilesOnPath, recordBlastMove, getWordPath, isBlastBoardCleared, regenerateBlastBoard, recordBlastBoardClear, tryBeginWaveAdvance, endWaveAdvance } from '../modules/blastModeManager.js';
import { makePositionsMap } from '../modules/wordValidator.js';
import { processTilesForWord } from '@/components/blast/legacy/utils/clearTilesProcessor';
import { computeGravityResult } from '@/components/blast/legacy/utils/blastGravity';
import { createSeededRandom } from '@/components/blast/legacy/utils/blastLetterGenerator';
import { BLAST_SPECIAL_TILE_CHANCE } from '@/shared/constants/blastMultiplayerConstants';
import { restoreLife, getLifeBonus, computeDiscoveryClues } from '../modules/wordHuntManager.js';
import { BOARD_WORD_SCORE_PER_LETTER } from '@/shared/constants/wordHuntMultiplayerConstants';

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

function handleValidatedWord(io: Server, socket: Socket, game: GameState, gameCode: string, username: string, normalizedWord: string, isInDictionary: boolean, comboType?: string | null, inputMethod: 'kb' | 'drag' = 'drag'): void {
  // Derive combo and fire round from server state (never trust client)
  const safeComboLevel = game.playerCombos?.[username] || 0;
  const fireRoundActive = game.fireRoundActive === true;
  const fireRoundMultiplier = fireRoundActive ? 2 : 1;
  const baseScore = normalizedWord.length - 1;
  const wordScore = calculateWordScore(normalizedWord, safeComboLevel, fireRoundMultiplier, 1, { inputMethod });
  // Calculate combo bonus without fire round multiplier for display purposes
  const scoreWithoutMultiplier = calculateWordScore(normalizedWord, safeComboLevel, 1, 1, { inputMethod });
  const comboBonus = scoreWithoutMultiplier - baseScore;
  // Fire round bonus is the additional points from the 2x multiplier
  const fireRoundBonus = fireRoundActive ? scoreWithoutMultiplier : 0;

  // Increment server-side combo on each accepted word
  if (!game.playerCombos) game.playerCombos = {};
  game.playerCombos[username] = safeComboLevel + 1;

  // Record this player as the first finder of this word
  const userData = game.users?.[username];
  const isFirstFinder = recordFirstFinder(gameCode, normalizedWord, username, userData?.avatar ?? undefined);

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

      // Server-side board mutation: process tile clears + gravity on authoritative state
      if (blastState.grid && blastState.tileStates) {
        const wordPath = getWordPath(normalizedWord, game.letterPositions || new Map());
        const gridSize = blastState.grid.length;
        const totalMoves = (blastState.totalMoves ?? 0) + 1;
        blastState.totalMoves = totalMoves;

        // Seeded RNG for deterministic processing
        const rng = createSeededRandom((blastState.seed ?? 0) + totalMoves);

        // 1. Process tile clears (bomb explosions, lightning, prism, etc.)
        const processResult = processTilesForWord({
          prev: blastState.tileStates,
          path: wordPath,
          word: normalizedWord,
          baseScore: normalizedWord.length - 1,
          gridSize,
          currentWave: blastState.wave ?? 1,
          rng,
        });

        // 2. Apply gravity WITH refill — timer-era Blast keeps the board alive
        // for the whole countdown; tiles cascade and refill continuously.
        const gravityResult = computeGravityResult(
          blastState.grid,
          processResult.next,
          gridSize,
          (game.language || 'en') as import('@/shared/types').Language,
          BLAST_SPECIAL_TILE_CHANCE,
          undefined,
          0,
          rng,
          true, // refill=true: continuous board for fixed-timer play
        );

        // 3. Update authoritative state
        blastState.grid = gravityResult.newGrid;
        blastState.tileStates = gravityResult.newTileStates;

        // Keep the authoritative board refs in sync with the live cascading
        // board so the NEXT word's on-board validation (wordHandler
        // isWordOnBoardAsync) and tile-path lookup run against the current
        // grid — not the stale start-of-round grid. The board-clear branch
        // below already does this; cascades need it every move too, otherwise
        // every blast word after the first fails validation and never scores.
        game.letterGrid = gravityResult.newGrid;
        game.letterPositions = makePositionsMap(gravityResult.newGrid, (game.language || 'en'));

        // 4. Broadcast board update to ALL players
        broadcastToRoom(io, getGameRoom(gameCode), 'blastBoardUpdate', {
          grid: gravityResult.newGrid,
          tileStates: gravityResult.newTileStates,
          clearedBy: username,
          word: normalizedWord,
          clearedCount: processResult.newlyClearedCount,
          totalMoves,
        });

        // 5. MP board-clear (timer era): rare with refill on, but if a player
        // fully clears the board, award a clear-bonus, regenerate overlay in
        // place, and keep playing. The game ends ONLY on the shared timer.
        if (isBlastBoardCleared(gravityResult.newTileStates) && tryBeginWaveAdvance(gameCode)) {
          try {
            recordBlastBoardClear(blastState, username);
            const next = regenerateBlastBoard(blastState, gameCode, gravityResult.newGrid);
            Object.assign(blastState, {
              overlay: next.overlay,
              overlayMap: next.overlayMap,
              tileStates: next.tileStates,
              seed: next.seed,
              grid: next.grid,
              refillCount: next.refillCount,
            });
            const nextGrid = next.grid ?? gravityResult.newGrid;
            game.letterGrid = nextGrid;
            game.letterPositions = makePositionsMap(nextGrid, (game.language || 'en'));
            logger.info('BLAST', `Board cleared in ${gameCode} by ${username} — regenerating board (refill #${next.refillCount})`);
            broadcastToRoom(io, getGameRoom(gameCode), 'blastBoardUpdate', {
              grid: nextGrid,
              tileStates: next.tileStates,
              overlay: next.overlay,
              seed: next.seed,
              clearedBy: '__board_regenerated__',
              word: '',
              clearedCount: 0,
              totalMoves: blastState.totalMoves ?? 0,
            });
            void resyncBotsForNewGrid(
              getGameBots(gameCode),
              nextGrid,
              (game.language || 'en') as import('@/shared/types').Language,
            );
          } finally {
            endWaveAdvance(gameCode);
          }
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('BLAST', `Blast bonus calculation error: ${error.message}`, {
        gameCode,
        username,
        word: normalizedWord,
        wave: game.blastModeState?.wave ?? null,
        stack: error.stack,
      });
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
    fromLesson: fromLesson,
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

  // In word-hunt mode, award extra score per letter for board words to reward vocabulary skill
  const wordHuntBoardBonus = (game.gameMode === 'word-hunt' && game.wordHuntState)
    ? normalizedWord.length * BOARD_WORD_SCORE_PER_LETTER
    : 0;

  // ---- Golden Letter Bonus ----
  // +25% rounded up if any letter of the word sits on a golden position
  let goldenBonus = 0;
  if (game.goldenLetters?.length && game.letterGrid) {
    const goldenChars = game.goldenLetters.map(g => {
      const row = game.letterGrid![g.row];
      return row ? String(row[g.col]).toLowerCase() : '';
    }).filter(Boolean);
    const usesGolden = normalizedWord.toLowerCase().split('').some(ch => goldenChars.includes(ch));
    if (usesGolden) {
      goldenBonus = Math.ceil(wordScore * 0.25);
    }
  }

  // ---- Special Word Detection ----
  let isSpecialWord = false;
  const specialWordBonus = 10;
  if (game.specialWords?.length) {
    const upperWord = normalizedWord.toUpperCase();
    const specialEntry = game.specialWords.find(sw => sw.word.toUpperCase() === upperWord && !sw.foundBy);
    if (specialEntry) {
      specialEntry.foundBy = username;
      isSpecialWord = true;
      broadcastToRoom(io, getGameRoom(gameCode), 'specialWordFound', {
        word: normalizedWord,
        foundBy: username,
        bonus: specialWordBonus,
        gameSessionId: game.gameSessionId,
      });
      logger.info('SPECIAL_WORD', `Game ${gameCode}: '${normalizedWord}' found by ${username} (+${specialWordBonus})`);
    }
  }
  const specialBonus = isSpecialWord ? specialWordBonus : 0;

  // Single atomic score update: word score + blast tile bonus + word-hunt board bonus + bonuses
  const preScore = game.playerScores?.[username] ?? 0;
  const totalDelta = wordScore + blastTileBonus + wordHuntBoardBonus + goldenBonus + specialBonus;
  updatePlayerScore(gameCode, username, totalDelta, true);
  game.serverSeq = (game.serverSeq ?? 0) + 1;

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
    isFirstFinder,
    fromLesson: fromLesson,
    inputMethod,
    ...(goldenBonus > 0 ? { goldenBonus } : {}),
    ...(isSpecialWord ? { isSpecialWord: true } : {}),
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
  const totalScore = preScore + totalDelta;
  const playerWordCount = (game.playerWords?.[username]?.length || 0) + 1;
  broadcastToRoom(io, getGameRoom(gameCode), 'playerFoundWord', {
    username: username,
    word: normalizedWord,
    wordCount: playerWordCount,
    score: totalScore,
    serverSeq: game.serverSeq,
    comboLevel: safeComboLevel,
    isFirstFinder,
    inputMethod,
    // Merged combo sync (Fix 2): combo type embedded in playerFoundWord instead of separate event
    ...(comboType ? { comboSync: { comboType, username } } : {}),
  });

  broadcastToRoom(io, getGameRoom(gameCode), 'scoreUpdate', {
    serverSeq: game.serverSeq,
    username,
    deltaScore: totalDelta,
    totalScore,
    lastWord: normalizedWord,
    lastWordScore: wordScore,
  });

  // Broadcast opponent word feed to all OTHER players (not the word finder)
  // Only reveals word length/first/last letter, not the full word
  broadcastToRoomExceptSender(socket, getGameRoom(gameCode), 'opponentWordFound', {
    playerId: username,
    playerName: username,
    wordLength: normalizedWord.length,
    firstLetter: normalizedWord[0]?.toUpperCase() ?? '',
    lastLetter: normalizedWord[normalizedWord.length - 1]?.toUpperCase() ?? '',
    score: wordScore + blastTileBonus,
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

export { handleValidatedWord, handleWordBecameValid, handlePeerRejection };
export type { PeerValidationResult, Achievement };
