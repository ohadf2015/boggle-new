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
  addPlayerEventBonus,
  getLeaderboard,
  recordFirstFinder,
  removePeerRejectedWordScore,
} from '../modules/gameStateManager.js';

import { broadcastToRoom, volatileBroadcastToRoom, getGameRoom, getSocketById, safeEmit } from '../utils/socketHelpers.js';
import { queueOpponentWord } from '../utils/opponentWordFeedBatcher.js';
import { queuePlayerFoundWord } from '../utils/playerFoundWordBatcher.js';
import { calculateWordScore } from '../modules/scoringEngine.js';
import { checkAndAwardAchievements } from '../modules/achievementManager.js';
import { isSupabaseConfigured, savePlayerWord, recordPlayerWrongWord } from '../modules/supabaseServer.js';
import { addWordToBlacklist } from '../modules/botManager.js';
import { inc, incPerGame } from '../utils/metrics.js';
import logger from '../utils/logger.js';
import { processLongWordEngagement } from './engagementHandler';
import { calculateBlastTileBonus, getTilesOnPath, recordBlastMove, getWordPath, getOrInitPlayerBoard, safeCascadeBlastWord } from '../modules/blastModeManager.js';
import { regenerateBlastBoardIfExhausted } from '../modules/blastBoardRegen.js';
import { makePositionsMap } from '../modules/wordValidator.js';
import { computeRushBonus } from '../modules/rushTiles/rushTilesLogic.js';
import { blastLetterBonus } from '@/lib/blast/blastLetterBonus';
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
  // Deterministic per-word letter-value bonus — organic, non-round totals that
  // reward rare letters. MUST match the client's optimistic fly (same pure fn,
  // lib/blast/blastLetterBonus) so the "+N" popup and the authoritative total
  // never disagree.
  const blastLetterValueBonus = game.gameMode === 'blast' ? blastLetterBonus(normalizedWord) : 0;
  let blastTilesCleared: string[] = [];
  let blastMoveResult: { movesUsed: number; bonusMove: boolean } | null = null;

  if (game.gameMode === 'blast' && game.blastModeState) {
    const blastState = game.blastModeState;
    // PER-PLAYER board: each player evolves their OWN board independently, so one
    // player's tile-clears never sync to another's. Validate/score/cascade against
    // THIS player's board, not the shared template.
    const board = getOrInitPlayerBoard(blastState, username);
    const lang = (game.language || 'en') as import('@/shared/types').Language;
    const boardPositions = makePositionsMap(board.grid, lang);

    // 1) Tile/letter bonus + move accounting. Degrade to bonus=0 on any failure
    //    (e.g. a corrupted overlay after a Redis restore) WITHOUT aborting — the
    //    base word still scores and, crucially, the cascade/resync below still runs.
    try {
      const tilesOnPath = getTilesOnPath(normalizedWord, boardPositions, board.overlay, board.overlayMap);
      blastTileBonus = calculateBlastTileBonus(tilesOnPath);
      blastTilesCleared = tilesOnPath;
      const gemCount = tilesOnPath.filter(t => t === 'gem').length;
      blastMoveResult = recordBlastMove(blastState, username, safeComboLevel, normalizedWord, tilesOnPath.length, gemCount, blastTileBonus);
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('BLAST', `Blast bonus calculation error: ${error.message}`, {
        gameCode,
        username,
        word: normalizedWord,
        wave: blastState.wave ?? null,
        stack: error.stack,
      });
      blastTileBonus = 0;
    }

    // 2) Cascade on THIS player's board with crash isolation. safeCascadeBlastWord
    //    runs the real cascade on a CLONE and commits only on success, so a
    //    mid-cascade throw can never corrupt the authoritative board. We ALWAYS
    //    unicast the authoritative board back (success = the new board, failure =
    //    the untouched one) so the client never strands on a diverged/frozen board.
    if (board.grid && board.tileStates) {
      const wordPath = getWordPath(normalizedWord, boardPositions);
      const result = safeCascadeBlastWord(board, wordPath, normalizedWord, blastState.wave ?? 1, lang);
      if (result.ok) {
        // Commit the successfully-cascaded board as this player's authoritative board.
        if (!blastState.playerBoards) blastState.playerBoards = {};
        blastState.playerBoards[username] = result.board;
      } else {
        logger.error('BLAST', 'Blast cascade failed; authoritative board kept intact for resync', {
          gameCode,
          username,
          word: normalizedWord,
          wave: blastState.wave ?? null,
        });
      }

      // UNICAST to the submitting player only — boards are independent, so
      // broadcasting would re-sync them (the original bug).
      safeEmit(socket, 'blastBoardUpdate', {
        grid: result.board.grid,
        tileStates: result.board.tileStates,
        clearedBy: username,
        word: normalizedWord,
        clearedCount: result.clearedCount,
        totalMoves: result.totalMoves,
      });

      // Per-player board refresh on exhaust (success path only — a failed cascade
      // didn't clear anything). A player can clear multiple boards in one round;
      // the game only ends on the round timer.
      if (result.ok) {
        regenerateBlastBoardIfExhausted({
          io,
          gameCode,
          game,
          username,
          board: result.board,
          newTileStates: result.board.tileStates,
          socket,
        });
      }
    }
  }

  addPlayerWord(gameCode, username, normalizedWord, {
    autoValidated: true,
    score: wordScore + blastTileBonus + blastLetterValueBonus,
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

  // ---- Lightning Round-Event Bonus ----
  // The 'lightning' round event charges a few board tiles (game.lightningTiles)
  // and advertises a 1.5x payout to the client (tiles glow). Char-based, exactly
  // like the golden-letter bonus above: if the word uses any charged-tile letter
  // while lightning is active, award +50% (ceil). Without this the broadcast
  // bonus was never scored — the event was cosmetic only.
  let lightningBonus = 0;
  const lightningTiles = (game as GameState & { lightningTiles?: Array<{ row: number; col: number }> }).lightningTiles;
  if (game.activeRoundEvent === 'lightning' && lightningTiles?.length && game.letterGrid) {
    const chargedChars = lightningTiles.map(tile => {
      const row = game.letterGrid![tile.row];
      return row ? String(row[tile.col]).toLowerCase() : '';
    }).filter(Boolean);
    const usesCharged = normalizedWord.toLowerCase().split('').some(ch => chargedChars.includes(ch));
    if (usesCharged) {
      lightningBonus = Math.ceil(wordScore * 0.5);
    }
  }

  // ---- Rush-Tile Bonus ----
  // Recurring transient rush tiles (game.rushTiles) award +50% (ceil) when the
  // word uses any rush-tile letter while a batch is active. Independent of
  // activeRoundEvent so it can stack with a live round event without clobbering it.
  const rushBonus = computeRushBonus(
    wordScore,
    normalizedWord,
    game.rushTiles,
    game.letterGrid as ReadonlyArray<ReadonlyArray<string>> | undefined,
    game.rushTilesActive === true,
  );

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

  // Single atomic score update: word score + blast tile bonus + blast letter-value
  // bonus + word-hunt board bonus + bonuses
  const preScore = game.playerScores?.[username] ?? 0;
  const totalDelta = wordScore + blastTileBonus + blastLetterValueBonus + wordHuntBoardBonus + goldenBonus + lightningBonus + rushBonus + specialBonus;
  updatePlayerScore(gameCode, username, totalDelta, true);
  // Mirror the bonuses that are NOT baked into the stored per-word score
  // (wordScore + blast bonuses are; golden/lightning/special/word-hunt-board are not)
  // into a per-player accumulator so the end-of-game recompute can add them back and
  // the result page matches the live leaderboard. See playerEventBonuses.
  const eventBonusDelta = wordHuntBoardBonus + goldenBonus + lightningBonus + rushBonus + specialBonus;
  if (eventBonusDelta !== 0) {
    addPlayerEventBonus(gameCode, username, eventBonusDelta);
  }
  game.serverSeq = (game.serverSeq ?? 0) + 1;

  inc('wordAccepted');
  incPerGame(gameCode, 'wordAccepted');

  socket.emit('wordAccepted', {
    word: normalizedWord,
    // Full per-word delta the player earned, so their live total (which the
    // server credits with the tile + letter-value bonus too) reconciles with the
    // sum of their per-word chips. Both blast bonuses are 0 outside Blast mode.
    score: wordScore + blastTileBonus + blastLetterValueBonus,
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
    ...(lightningBonus > 0 ? { lightningBonus } : {}),
    ...(rushBonus > 0 ? { rushBonus } : {}),
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

  // Queue playerFoundWord (live feed / combo FX / TV broadcast / pending-chip
  // confirm). Coalesced into a windowed `playerFoundWordBatch` broadcast instead
  // of one emit per word — see playerFoundWordBatcher. Per-word payload shape is
  // preserved verbatim inside the batch array.
  const totalScore = preScore + totalDelta;
  const playerWordCount = (game.playerWords?.[username]?.length || 0) + 1;
  queuePlayerFoundWord(io, gameCode, {
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

  // Queue the opponent word feed (cosmetic: length + first/last letter only,
  // never the full word). Coalesced into a single windowed `opponentWordsBatch`
  // broadcast instead of one emit per word — see opponentWordFeedBatcher. The
  // client filters out its own words, so we broadcast to the whole room.
  queueOpponentWord(io, gameCode, {
    playerId: username,
    playerName: username,
    wordLength: normalizedWord.length,
    firstLetter: normalizedWord[0]?.toUpperCase() ?? '',
    lastLetter: normalizedWord[normalizedWord.length - 1]?.toUpperCase() ?? '',
    score: wordScore + blastTileBonus + blastLetterValueBonus,
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
