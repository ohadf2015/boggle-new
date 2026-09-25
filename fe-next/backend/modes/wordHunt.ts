/**
 * Word Hunt — find the hidden target word; board words keep you alive.
 */

import type { LetterGrid } from '@/shared/types';
import type { GameModeModule } from './types';
import {
  initWordHuntState,
  selectTargetWordWithFallback,
  selectCleanCommonTarget,
  recordMpTarget,
  getRecentMpTargets,
} from '../modules/wordHuntManager';
import { makePositionsMap, normalizeWordForLanguage } from '../modules/wordValidator';
import { getCachedTrie } from '../modules/boggleSolver';
import { findAllWordsAsync } from '../modules/wordValidatorPool';
import { generateRandomTable } from '../utils/gameUtils';
import { generateRichBoard } from '../utils/boardSelection';
import { resolveTeacherHuntTarget } from '@/shared/utils/classroomHuntTarget';
import { sortWithWordHuntWinner } from '@/shared/utils/scoring';
import { HUNT_INITIAL_LIFE, HUNT_TARGET_MIN_LENGTH, HUNT_TARGET_MAX_LENGTH } from '@/shared/constants/wordHuntMultiplayerConstants';
import logger from '../utils/logger';

/** Board words of at least this length count toward the "N words on board" chip. */
const MIN_DISPLAY_WORD_LENGTH = 5;

export const wordHuntMode: GameModeModule = {
  id: 'word-hunt',

  async initRound({ game, gameCode, language, letterGrid, gridRows, gridCols, playerUsernames, vocabToEmbed, classroomGame }) {
    const recentTargets = getRecentMpTargets(language);
    // TARGET-FIRST (fail-closed): pick a clean curated word, then rebuild the
    // board to embed it (guaranteed findable). A teacher-pinned lesson word wins
    // over the curated pool. Normalized to the board/solver form (Hebrew finals
    // → base letters) so it matches the grid and the tile-derived guesses.
    const teacherTarget = resolveTeacherHuntTarget(
      classroomGame?.settings?.targetWord,
      classroomGame?.vocabularyWords ?? [],
    );
    const cleanTargetRaw = teacherTarget ?? (vocabToEmbed.length > 0 ? null : selectCleanCommonTarget(language, recentTargets));
    const cleanTarget = cleanTargetRaw ? normalizeWordForLanguage(cleanTargetRaw, language) : null;

    let grid: LetterGrid = letterGrid;
    if (cleanTarget) {
      // Target first so it wins the embed, but keep the rest of the lesson vocabulary.
      const wordsToEmbed = [cleanTarget, ...vocabToEmbed.filter((w) => w.toUpperCase() !== cleanTarget.toUpperCase())];
      grid = generateRichBoard(
        () => generateRandomTable(gridRows, gridCols, language, wordsToEmbed),
        language,
        gridRows,
        gridCols,
      ) as LetterGrid;
      game.letterGrid = grid;
      game.letterPositions = makePositionsMap(grid);
    }

    const allValidWords: string[] = await findAllWordsAsync(grid, language, {
      minLength: 3, maxLength: 8, maxWords: 10000, trie: getCachedTrie(language),
    });
    // Prefer the embedded clean target; the solve-based selector is the fallback
    // (classroom boards, or an embed that somehow didn't land). Recent targets excluded.
    const targetWord = (cleanTarget && allValidWords.some((w) => w.toLowerCase() === cleanTarget.toLowerCase()))
      ? cleanTarget
      : selectTargetWordWithFallback(allValidWords, HUNT_TARGET_MIN_LENGTH, HUNT_TARGET_MAX_LENGTH, language, recentTargets);
    if (!targetWord) {
      logger.info('WORD_HUNT', `No target word found for game ${gameCode} - falling back to classic mode`);
      return { letterGrid: grid, downgradeTo: 'classic' };
    }
    recordMpTarget(language, targetWord);
    game.wordHuntState = initWordHuntState(targetWord, playerUsernames);
    // The solve is reused for the board-word count (no second traversal).
    return {
      letterGrid: grid,
      totalBoardWords: allValidWords.filter((w) => w.length >= MIN_DISPLAY_WORD_LENGTH).length,
    };
  },

  payloadFields(game, { resume }) {
    const hunt = game.wordHuntState;
    if (!hunt) return {};
    return {
      wordHuntTargetLength: hunt.targetWordLength ?? 0,
      wordHuntTargetCategory: hunt.targetCategory ?? null,
      wordHuntPlayerLives: hunt.playerLives || {},
      ...(resume ? { wordHuntEliminatedPlayers: hunt.eliminatedPlayers || [] } : {}),
    };
  },

  onLateJoin(game, username) {
    const hunt = game.wordHuntState;
    if (hunt && !(username in hunt.playerLives)) hunt.playerLives[username] = HUNT_INITIAL_LIFE;
  },

  resultsSummary(game) {
    const hunt = game.wordHuntState;
    if (!hunt) return {};
    return {
      wordHuntSummary: {
        targetWord: hunt.targetWord,
        playerLives: hunt.playerLives as Record<string, number>,
        eliminatedPlayers: hunt.eliminatedPlayers as string[],
        targetFoundBy: hunt.targetFoundBy as string | null,
        foundTarget: !!hunt.targetFoundBy,
        survivalTime: game.gameStartedAt ? Math.round((Date.now() - game.gameStartedAt) / 1000) : 0,
        discoveryWords: hunt.discoveryWordCount || 0,
        // Per-player same-length guess count → guess-efficiency tip (server is the
        // source of truth for ALL players).
        playerAttempts: (hunt.playerAttempts || {}) as Record<string, number>,
      },
    };
  },

  // The player who found the target wins; everyone else by score.
  rankResults(scores, game) {
    const finder = game.wordHuntState?.targetFoundBy;
    return finder ? sortWithWordHuntWinner(scores, finder, (p) => p.totalScore) : scores;
  },
};
