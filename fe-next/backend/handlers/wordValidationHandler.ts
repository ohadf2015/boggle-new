/**
 * Word Validation Handler
 * Handles validated word processing, community validation, and peer rejection
 */

import type { Server, Socket } from 'socket.io';
import type { WordDetail, Language } from '@/shared/types';
import type { GameState } from '../modules/gameState/types.js';

import {
  addPlayerWord,
  updatePlayerScore,
  addPlayerEventBonus,
  recordFirstFinder,
} from '../modules/gameStateManager.js';

import { broadcastToRoom, getGameRoom, getSocketById, safeEmit } from '../utils/socketHelpers.js';
import { queueOpponentWord } from '../utils/opponentWordFeedBatcher.js';
import { queuePlayerFoundWord } from '../utils/playerFoundWordBatcher.js';
import { checkAndAwardAchievements, type GameWithAchievements } from '../modules/achievementManager.js';
import { isSupabaseConfigured, savePlayerWord } from '../modules/supabaseServer.js';
import { inc, incPerGame } from '../utils/metrics.js';
import logger from '../utils/logger.js';
import { handlePeerRejection, type PeerValidationResult } from './peerRejectionHandler';
import { hitRoomBoss } from '../services/classroomBoss/roomBoss.js';
import { processLongWordEngagement } from './engagementHandler';
import { getTilesOnBoardPath, recordBlastMove, recordBlastCollection, getWordPath, getOrInitPlayerBoard, safeCascadeBlastWord, validateBlastWordPath } from '../modules/blastModeManager.js';
import { regenerateBlastBoardIfExhausted } from '../modules/blastBoardRegen.js';
import { makePositionsMap } from '../modules/wordValidator.js';
import { isLessonWord } from '../utils/lessonVocabulary.js';
import { computeRushBonus } from '../modules/rushTiles/rushTilesLogic.js';
import { scoreAcceptedWord, blastTileBonusFor } from '../modules/wordScore.js';
import { economyOnWordAccepted, economyUserIdOf, roundIdOf } from './classroomEconomyHandler.js';
import type { BlastTileType } from '@/shared/types/blast';
import { tileCharBonus } from '../modules/tileCharBonus';
import { catchUpForPlayer } from '../modules/catchUpBonus';
import { advanceServerCombo } from '../modules/comboDecay';
import { applyWordHuntWordEffects, bumpServerSeq } from './wordCreditEffects';
import { BOARD_WORD_SCORE_PER_LETTER } from '@/shared/constants/wordHuntMultiplayerConstants';
import { lessonWordBonus } from '@/shared/constants/lessonScoring';

type Tile = { row: number; col: number };

interface Achievement {
  key: string;
  icon: string;
}

function handleValidatedWord(io: Server, socket: Socket, game: GameState, gameCode: string, username: string, normalizedWord: string, isInDictionary: boolean, comboType?: string | null, inputMethod: 'kb' | 'drag' = 'drag', clientPath?: Array<{ row: number; col: number }> | null): void {
  // Derive combo and fire round from server state (never trust client)
  const { scoringLevel: safeComboLevel } = advanceServerCombo(game, username);
  const fireRoundActive = game.fireRoundActive === true;

  // Record this player as the first finder of this word
  const userData = game.users?.[username];
  const isFirstFinder = recordFirstFinder(gameCode, normalizedWord, username, userData?.avatar ?? undefined);

  // Check if word is from lesson vocabulary (classroom games).
  // Both sides go through the same normalizer — see backend/utils/lessonVocabulary.
  const fromLesson = isLessonWord(
    game.lessonVocabulary,
    normalizedWord,
    (game.language || 'en') as Language
  );

  // ---- Lesson-word bonus ----
  // Flat, not a percentage — see shared/constants/lessonScoring.ts for the
  // reasoning (speed-neutral, length-neutral, legible to a student mid-round).
  // Until this existed `fromLesson` was computed, stored and broadcast while
  // paying nothing, so a class playing its teacher's vocabulary scored exactly
  // like a class on a random board.
  //
  // KNOWN LIMIT: this rides the auto-validated path only. A word that scores
  // later through community/peer validation (`handleWordBecameValid`) never
  // reads `lessonVocabulary` at all and so earns no lesson bonus. A teacher's
  // vocabulary word is normally a dictionary word and lands here; the peer-
  // validated lesson word is the rare case, and covering it means emitting to a
  // socket that path does not currently hold.
  const lessonBonus = lessonWordBonus(fromLesson);

  const economyUserId = economyUserIdOf(socket);
  if (economyUserId) {
    void economyOnWordAccepted(socket, {
      gameCode,
      roundId: roundIdOf(game, gameCode),
      userId: economyUserId,
      word: normalizedWord,
      fromLesson,
    });
  }

  // Blast: the special tiles on this word's path. Non-null marks a Blast word
  // (which also earns the letter-value bonus); tiles stay [] if the lookup fails.
  let blastTiles: BlastTileType[] | null = game.gameMode === 'blast' ? [] : null;
  let blastCollectionPoints = 0;
  let blastMoveResult: { movesUsed: number; bonusMove: boolean } | null = null;

  if (game.gameMode === 'blast' && game.blastModeState) {
    const blastState = game.blastModeState;
    // PER-PLAYER board: each player evolves their OWN board independently, so one
    // player's tile-clears never sync to another's. Validate/score/cascade against
    // THIS player's board, not the shared template.
    const board = getOrInitPlayerBoard(blastState, username);
    const lang = (game.language || 'en') as import('@/shared/types').Language;
    const boardPositions = makePositionsMap(board.grid, lang);

    // The client submits the EXACT cells the player dragged through. Trust it
    // (after full validation) over the arbitrary DFS reconstruction — otherwise
    // special tiles on the player's real path never crack/explode server-side
    // and the authoritative board update visibly "resurrects" them (the "ice
    // and bomb don't break or explode" report). Falls back to reconstruction
    // for legacy clients or a stale board.
    const validatedClientPath = validateBlastWordPath(normalizedWord, clientPath, board.grid, lang);
    const resolvedPath = validatedClientPath ?? getWordPath(normalizedWord, boardPositions);

    // 1) Tile/letter bonus + move accounting. Degrade to bonus=0 on any failure
    //    (e.g. a corrupted overlay after a Redis restore) WITHOUT aborting — the
    //    base word still scores and, crucially, the cascade/resync below still runs.
    try {
      const tilesOnPath = getTilesOnBoardPath(board.tileStates, resolvedPath);
      blastMoveResult = recordBlastMove(blastState, username, safeComboLevel, normalizedWord, tilesOnPath.length, blastTileBonusFor(tilesOnPath));
      blastTiles = tilesOnPath;
    } catch (err: unknown) {
      const error = err as Error;
      logger.error('BLAST', `Blast bonus calculation error: ${error.message}`, {
        gameCode,
        username,
        word: normalizedWord,
        wave: blastState.wave ?? null,
        stack: error.stack,
      });
      blastTiles = [];
    }

    // 2) Cascade on THIS player's board with crash isolation. safeCascadeBlastWord
    //    runs the real cascade on a CLONE and commits only on success, so a
    //    mid-cascade throw can never corrupt the authoritative board. We ALWAYS
    //    unicast the authoritative board back (success = the new board, failure =
    //    the untouched one) so the client never strands on a diverged/frozen board.
    if (board.grid && board.tileStates) {
      const wordPath = resolvedPath;
      const result = safeCascadeBlastWord(board, wordPath, normalizedWord, blastState.wave ?? 1, lang);
      if (result.ok) {
        // Commit the successfully-cascaded board as this player's authoritative board.
        if (!blastState.playerBoards) blastState.playerBoards = {};
        blastState.playerBoards[username] = result.board;
        blastCollectionPoints = recordBlastCollection(blastState, username, {
          coins: result.coinsCollected,
          diamonds: result.diamondsCollected,
          bombs: result.bombsPopped,
        });
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

  // THE per-word score: computed once, integer, and every number below (stored
  // detail for results, live total, wordAccepted, feeds) reads it verbatim.
  const scored = scoreAcceptedWord({
    word: normalizedWord,
    comboLevel: safeComboLevel,
    fireRoundActive,
    inputMethod,
    blastTiles,
  });
  const { baseScore, wordScore, comboBonus, fireRoundMultiplier, fireRoundBonus, blastTileBonus } = scored;
  const blastTilesCleared = blastTiles ?? [];

  addPlayerWord(gameCode, username, normalizedWord, {
    autoValidated: true,
    score: scored.total,
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

  // Golden letters (+25%) and the lightning / meteor round events (+50%, as advertised to the client).
  const eventTiles = game as GameState & { lightningTiles?: Tile[]; meteorTiles?: Tile[] };
  const goldenBonus = tileCharBonus(normalizedWord, game.goldenLetters, game.letterGrid, wordScore, 0.25);
  const lightningBonus = game.activeRoundEvent === 'lightning'
    ? tileCharBonus(normalizedWord, eventTiles.lightningTiles, game.letterGrid, wordScore, 0.5)
    : 0;
  const meteorBonus = game.activeRoundEvent === 'meteor'
    ? tileCharBonus(normalizedWord, eventTiles.meteorTiles, game.letterGrid, wordScore, 0.5)
    : 0;

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

  const preScore = game.playerScores?.[username] ?? 0;
  const catchUp = catchUpForPlayer(game, username, preScore, scored.total);
  const catchUpBonus = catchUp?.bonus ?? 0;

  // Single atomic score update: word score + blast tile bonus + blast letter-value
  // bonus + word-hunt board bonus + bonuses
  // Every bonus NOT baked into the stored per-word score also goes into
  // playerEventBonuses, so the end-of-game recompute matches the live leaderboard.
  const eventBonusDelta = wordHuntBoardBonus + goldenBonus + lightningBonus + meteorBonus + rushBonus + specialBonus + lessonBonus + blastCollectionPoints + catchUpBonus;
  const totalDelta = scored.total + eventBonusDelta;
  updatePlayerScore(gameCode, username, totalDelta, true);
  if (eventBonusDelta !== 0) {
    addPlayerEventBonus(gameCode, username, eventBonusDelta);
  }
  bumpServerSeq(game);
  const boss = hitRoomBoss(io, gameCode, game, { username, word: normalizedWord, score: totalDelta });

  inc('wordAccepted');
  incPerGame(gameCode, 'wordAccepted');

  socket.emit('wordAccepted', {
    word: normalizedWord,
    // Full per-word delta the player earned, so their live total (which the
    // server credits with the tile + letter-value bonus too) reconciles with the
    // sum of their per-word chips. Both blast bonuses are 0 outside Blast mode.
    score: scored.total,
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
    ...(meteorBonus > 0 ? { meteorBonus } : {}),
    ...(catchUp ? { catchUp: { bonus: catchUp.bonus, pct: catchUp.pct } } : {}),
    ...(rushBonus > 0 ? { rushBonus } : {}),
    ...(lessonBonus > 0 ? { lessonBonus } : {}),
    ...(isSpecialWord ? { isSpecialWord: true } : {}),
    ...(boss ? { boss } : {}),
    // Merged blast data (Fix 2): includes tile bonus, moves, combo info in single emit
    ...(blastMoveResult ? {
      blast: {
        tileBonus: blastTileBonus,
        collectionPoints: blastCollectionPoints,
        tilesCleared: blastTilesCleared,
        movesUsed: blastMoveResult.movesUsed,
        bonusMove: blastMoveResult.bonusMove,
        comboType: comboType ?? null,
      },
    } : {}),
  });

  applyWordHuntWordEffects(io, socket, game, gameCode, username, normalizedWord);

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
    score: scored.total,
  });

  // Check achievements
  const achievements: Achievement[] = checkAndAwardAchievements(game as unknown as GameWithAchievements, username, normalizedWord);
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
      const potentialScore = wordDetail.score || scoreAcceptedWord({ word, comboLevel: wordDetail.comboLevel || 0 }).total;

      wordDetail.validated = true;
      wordDetail.validatedByCommunity = true;

      // Use atomic delta increment to avoid race conditions with concurrent score updates
      updatePlayerScore(gameCode, submitter, potentialScore, true);
      const newScore = game.playerScores?.[submitter] || 0;
      const boss = hitRoomBoss(io, gameCode, game, { username: submitter, word, score: potentialScore });

      logger.info('VOTE', `Word "${word}" validated! Awarding ${potentialScore} to ${submitter}`);

      const submitterData = game.users?.[submitter];
      if (submitterData?.socketId) {
        const submitterSocket = getSocketById(io, submitterData.socketId);
        if (submitterSocket) {
          safeEmit(submitterSocket, 'wordValidatedByVotes', {
            word,
            score: potentialScore,
            newTotalScore: newScore,
            ...(boss ? { boss } : {}),
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

export { handleValidatedWord, handleWordBecameValid, handlePeerRejection };
export type { PeerValidationResult, Achievement };
