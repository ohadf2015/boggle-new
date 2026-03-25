/**
 * Hint Handler
 * Provides AI-powered hints for single-player mode.
 *
 * Features:
 * - Only available when 1 human player in room (bots don't count)
 * - Limited hints per game (default: 3)
 * - Uses boggleSolver to find available words, AI for hint generation
 */

import type { Server, Socket } from 'socket.io';
import type { Game, GameUser, Language } from '@/shared/types';

import {
  getGame,
  getGameBySocketId,
  getUsernameBySocketId,
} from '../modules/gameStateManager.js';

import { findWordsForBots, getCachedTrie } from '../modules/boggleSolver.js';
import { safeEmit } from '../utils/socketHelpers.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import logger from '../utils/logger.js';
import { gameCleanupEmitter } from '../events/gameCleanup';

// Configuration
const HINTS_PER_GAME = 3;
const HINT_COOLDOWN_MS = 30000; // 30 seconds between hints

// Types
interface HintState {
  hintsUsed: number;
  lastHintTime: number;
}

interface HintAvailability {
  available: boolean;
  reason?: string;
  hintsRemaining?: number;
}

interface HintData {
  hint: string;
  hintType: 'definition' | 'firstLetter' | 'length' | 'category';
  wordLength: number;
  firstLetter: string;
}

interface WordsByDifficulty {
  easy: string[];
  medium: string[];
  hard: string[];
}

interface HintResult {
  hint: string;
  hintType: 'definition' | 'firstLetter' | 'length' | 'category';
  targetWord: string;
  error?: string;
}

interface GameAIService {
  isConfigured: () => Promise<boolean>;
  generateHint: (word: string, language: string, hintLevel: number) => Promise<HintResult>;
}

// Track hints per game: gameCode -> { hintsUsed: number, lastHintTime: number }
const gameHintState = new Map<string, HintState>();

// Subscribe to cleanup events (breaks circular dependency with shared.ts)
gameCleanupEmitter.onGameEnd(({ gameCode }) => {
  gameHintState.delete(gameCode);
});

gameCleanupEmitter.onGameReset(({ gameCode }) => {
  gameHintState.delete(gameCode);
});

/**
 * Check if hints are available for this game/player
 */
function canUseHint(gameCode: string, game: Game): HintAvailability {
  // Must be in active game
  if (game.gameState !== 'in-progress') {
    return { available: false, reason: 'Game not in progress' };
  }

  // Count human players (exclude bots)
  const humanPlayers = Object.values(game.users).filter((u: GameUser) => !u.isBot && !u.disconnected);
  if (humanPlayers.length > 1) {
    return { available: false, reason: 'Hints only available in single-player mode' };
  }

  // Check hint limit
  const hintState = gameHintState.get(gameCode) || { hintsUsed: 0, lastHintTime: 0 };
  if (hintState.hintsUsed >= HINTS_PER_GAME) {
    return { available: false, reason: 'No hints remaining' };
  }

  // Check cooldown
  const now = Date.now();
  if (now - hintState.lastHintTime < HINT_COOLDOWN_MS) {
    const waitTime = Math.ceil((HINT_COOLDOWN_MS - (now - hintState.lastHintTime)) / 1000);
    return { available: false, reason: `Wait ${waitTime}s for next hint` };
  }

  return {
    available: true,
    hintsRemaining: HINTS_PER_GAME - hintState.hintsUsed,
  };
}

/**
 * Get available words on the current board that player hasn't found
 */
function getUnfoundWords(game: Game, username: string): string[] {
  if (!game.letterGrid) return [];

  const language = game.language || 'en';
  const minLength = game.minWordLength || 2;

  // Get all valid words on board using boggleSolver
  const wordsResult: WordsByDifficulty = findWordsForBots(game.letterGrid, language, { minLength });

  // Combine all difficulty levels
  const allWords = [
    ...wordsResult.easy,
    ...wordsResult.medium,
    ...wordsResult.hard,
  ];

  // Filter out words player already found
  const playerWords: string[] = game.playerWords?.[username] || [];
  const foundWordsLower = playerWords.map(w => w.toLowerCase());

  const unfoundWords = allWords.filter(
    word => !foundWordsLower.includes(word.toLowerCase())
  );

  return unfoundWords;
}

/**
 * Generate a hint for an unfound word
 * Uses AI if available, falls back to simple hints
 */
async function generateHintForWord(targetWord: string, language: Language): Promise<HintData> {
  const length = targetWord.length;
  const firstLetter = targetWord[0].toUpperCase();
  const lastLetter = targetWord[targetWord.length - 1].toUpperCase();

  // Try to use AI service if available
  try {
    // Dynamic import to avoid circular dependencies
    const { gameAIService } = require('../../lib/ai-service') as { gameAIService: GameAIService };

    if (await gameAIService.isConfigured()) {
      const hintLevel = length <= 4 ? 1 : length <= 6 ? 2 : 3;
      const result = await gameAIService.generateHint(targetWord, language, hintLevel);

      return {
        hint: result.hint,
        hintType: result.hintType,
        wordLength: length,
        firstLetter: firstLetter,
      };
    }
  } catch (error: unknown) {
    const err = error as Error;
    logger.debug('HINT', `AI hint unavailable, using simple hint: ${err.message}`);
  }

  // Fallback: Enhanced hints without AI - more specific and helpful
  const secondLetter = length >= 2 ? targetWord[1].toUpperCase() : '';
  const thirdLetter = length >= 3 ? targetWord[2].toUpperCase() : '';
  const middleIndex = Math.floor(length / 2);
  const middleLetter = targetWord[middleIndex].toUpperCase();

  // Count vowels/consonants for pattern hints
  const vowels = 'AEIOU';
  const vowelCount = [...targetWord.toUpperCase()].filter(c => vowels.includes(c)).length;
  const consonantCount = length - vowelCount;

  // Build varied hints based on word characteristics
  const hintTypes: Array<{ hint: string; hintType: 'firstLetter' | 'length' | 'category' }> = [
    // Pattern-based hints
    {
      hint: `${length} letters: "${firstLetter}" → "${secondLetter}" → ... → "${lastLetter}"`,
      hintType: 'firstLetter',
    },
    {
      hint: `A ${length}-letter word with "${middleLetter}" in the middle`,
      hintType: 'category',
    },
    // Vowel/consonant pattern
    {
      hint: `${length} letters with ${vowelCount} vowel${vowelCount !== 1 ? 's' : ''} - starts with "${firstLetter}"`,
      hintType: 'firstLetter',
    },
    // Double letter hints (if applicable)
    ...(targetWord.match(/(.)\1/) ? [{
      hint: `Look for a ${length}-letter word with double letters, starting with "${firstLetter}"`,
      hintType: 'category' as const,
    }] : []),
    // Length category hints
    ...(length <= 4 ? [{
      hint: `Short and sweet: ${length} letters, begins "${firstLetter}${secondLetter}..."`,
      hintType: 'firstLetter' as const,
    }] : []),
    ...(length >= 6 ? [{
      hint: `A longer word: ${length} letters from "${firstLetter}" to "${lastLetter}"`,
      hintType: 'firstLetter' as const,
    }] : []),
    // More descriptive pattern hints
    {
      hint: `"${firstLetter}_${thirdLetter ? '_' + thirdLetter : ''}..." - ${length} letters total, ends in "${lastLetter}"`,
      hintType: 'firstLetter',
    },
  ];

  const selected = hintTypes[Math.floor(Math.random() * hintTypes.length)];

  return {
    hint: selected.hint,
    hintType: selected.hintType,
    wordLength: length,
    firstLetter: firstLetter,
  };
}

/**
 * Register hint socket event handlers
 * @param io - Socket.IO server instance
 * @param socket - Socket.IO socket instance
 */
function registerHintHandlers(io: Server, socket: Socket): void {

  socket.on('requestHint', async () => {
    try {
      // Rate limiting
      if (!checkRateLimit(socket.id)) {
        socket.emit('rateLimited');
        return;
      }

      const gameCode = getGameBySocketId(socket.id);
      if (!gameCode) {
        safeEmit(socket, 'hintError', {
          message: 'Not in a game',
          code: 'NOT_IN_GAME',
        });
        return;
      }

      const game = getGame(gameCode);
      if (!game) {
        safeEmit(socket, 'hintError', {
          message: 'Game not found',
          code: 'GAME_NOT_FOUND',
        });
        return;
      }

      const username = getUsernameBySocketId(socket.id);
      if (!username) {
        safeEmit(socket, 'hintError', {
          message: 'Player not found',
          code: 'PLAYER_NOT_FOUND',
        });
        return;
      }

      // Check if hints are available
      const hintCheck = canUseHint(gameCode, game as unknown as Parameters<typeof canUseHint>[1]);
      if (!hintCheck.available) {
        safeEmit(socket, 'hintError', {
          message: hintCheck.reason,
          code: 'HINT_UNAVAILABLE',
        });
        return;
      }

      // Get unfound words
      const unfoundWords = getUnfoundWords(game as unknown as Game, username);
      if (unfoundWords.length === 0) {
        safeEmit(socket, 'hintError', {
          message: 'No more words to hint!',
          code: 'NO_WORDS_LEFT',
        });
        return;
      }

      // Sort by length (prefer longer words = more points)
      unfoundWords.sort((a, b) => b.length - a.length);

      // Pick from top 10 longest words randomly for variety
      const topCandidates = unfoundWords.slice(0, Math.min(10, unfoundWords.length));
      const targetWord = topCandidates[Math.floor(Math.random() * topCandidates.length)];

      logger.info('HINT', `Generating hint for "${targetWord}" (${unfoundWords.length} unfound words)`);

      // Generate hint
      const hintData = await generateHintForWord(targetWord, game.language || 'en');

      // Update hint state
      const hintState = gameHintState.get(gameCode) || { hintsUsed: 0, lastHintTime: 0 };
      hintState.hintsUsed++;
      hintState.lastHintTime = Date.now();
      gameHintState.set(gameCode, hintState);

      const hintsRemaining = HINTS_PER_GAME - hintState.hintsUsed;

      // Send hint to player
      safeEmit(socket, 'hintResponse', {
        hint: hintData.hint,
        hintType: hintData.hintType,
        hintsRemaining,
        wordLength: hintData.wordLength,
        firstLetter: hintData.firstLetter,
      });

      logger.info('HINT', `Sent hint to ${username} (${hintsRemaining} remaining)`);

    } catch (error: unknown) {
      const err = error as Error;
      logger.error('HINT', `requestHint handler failed: ${err.message}`);
      safeEmit(socket, 'hintError', {
        message: 'Failed to generate hint',
        code: 'HINT_ERROR',
      });
    }
  });
}

/**
 * Clear hint state for a game (call on game reset/end)
 */
function clearGameHintState(gameCode: string): void {
  gameHintState.delete(gameCode);
}

/**
 * Get current hint state for a game
 */
function getGameHintState(gameCode: string): { hintsUsed: number; lastHintTime: number; hintsRemaining: number; maxHints: number } {
  const state = gameHintState.get(gameCode) || { hintsUsed: 0, lastHintTime: 0 };
  return {
    ...state,
    hintsRemaining: HINTS_PER_GAME - state.hintsUsed,
    maxHints: HINTS_PER_GAME,
  };
}

export {
  registerHintHandlers,
  clearGameHintState,
  getGameHintState,
  canUseHint,
  HINTS_PER_GAME,
};
