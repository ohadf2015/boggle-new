/**
 * Bot Word Hunt Service
 *
 * Enables bots to play Word Hunt mode by making Wordle-style target guesses.
 * Bots maintain a candidate list and filter it based on feedback.
 */

import type { Server } from 'socket.io';
import type { Language, LetterFeedback, WordHuntModeState } from '@/shared/types/game';
import type { Bot } from '../../modules/botBehavior';
import {
  validateTargetGuess,
  recordTargetFound,
  penalizeWrongGuess,
} from '../../modules/wordHuntManager';
import {
  updatePlayerScore,
  getGame,
} from '../../modules/gameStateManager';
import { broadcastToRoom, getGameRoom } from '../../utils/socketHelpers';
import { findAllWords, getCachedTrie } from '../../modules/boggleSolver';
import { endGame } from './gameEnd';
import { getBestHumanScore } from './botGame';
import { setBotTimeout } from '../../modules/botLifecycle';
import { ensureLanguageLoaded } from '../../dictionary';
import logger from '../../utils/logger';

/** Delay before ending game after bot finds target (ms) */
const TARGET_FOUND_END_DELAY_MS = 3000;

/** Score buffer when no human has scored yet (matches botGame.ts) */
const BOT_SCORE_BUFFER = 20;

/** Timing config per difficulty — startDelay is high so bots find regular words first.
 *  minWrongGuesses × HUNT_WRONG_GUESS_PENALTY (10) approaches HUNT_INITIAL_LIFE (100):
 *  easy bots are designed to often bleed out before finding the target. */
const HUNT_TIMING: Record<string, {
  minDelay: number; maxDelay: number; startDelay: number;
  minWrongGuesses: number; stumbleChance: number;
}> = {
  easy:   { minDelay: 14000, maxDelay: 26000, startDelay: 30000, minWrongGuesses: 9, stumbleChance: 0.65 },
  medium: { minDelay: 10000, maxDelay: 20000, startDelay: 22000, minWrongGuesses: 6, stumbleChance: 0.45 },
  hard:   { minDelay: 6000,  maxDelay: 13000, startDelay: 14000, minWrongGuesses: 4, stumbleChance: 0.25 },
};

export interface BotWordHuntStrategy {
  candidates: string[];
  guessesMade: string[];
  minDelay: number;
  maxDelay: number;
  startDelay: number;
  minWrongGuesses: number;
  stumbleChance: number;
  targetWord: string;
}

/**
 * Filter candidates based on Wordle feedback from a guess.
 */
export function filterCandidatesByFeedback(
  candidates: string[],
  guess: string,
  feedback: LetterFeedback[]
): string[] {
  return candidates.filter(word => {
    if (word === guess) return false; // Already guessed

    for (let i = 0; i < feedback.length; i++) {
      const guessLetter = guess[i];
      const wordLetter = word[i];

      switch (feedback[i]) {
        case 'correct':
          // Must have same letter at same position
          if (wordLetter !== guessLetter) return false;
          break;
        case 'present':
          // Must contain letter but NOT at this position
          if (wordLetter === guessLetter) return false;
          if (!word.includes(guessLetter)) return false;
          break;
        case 'absent':
          // Must NOT contain letter (unless it's correct/present elsewhere)
          if (word.includes(guessLetter)) {
            // Count how many times this letter is marked correct/present in the guess
            const neededCount = feedback.filter(
              (f, j) => guess[j] === guessLetter && (f === 'correct' || f === 'present')
            ).length;
            if (neededCount === 0) return false;
            // Candidate must not have MORE of this letter than needed
            const candidateCount = [...word].filter(c => c === guessLetter).length;
            if (candidateCount > neededCount) return false;
          }
          break;
      }
    }
    return true;
  });
}

/**
 * Pick a guess from remaining candidates.
 * Avoids the target word until the bot has made enough wrong guesses,
 * and even then may "stumble" past it to simulate human imperfection.
 */
export function pickBotGuess(
  candidates: string[],
  _difficulty: string,
  strategy?: BotWordHuntStrategy
): string | null {
  if (candidates.length === 0) return null;

  if (strategy) {
    const pastMinGuesses = strategy.guessesMade.length >= strategy.minWrongGuesses;
    const nonTarget = candidates.filter(w => w !== strategy.targetWord);

    // Before enough wrong guesses: always avoid the target
    if (!pastMinGuesses && nonTarget.length > 0) {
      return nonTarget[Math.floor(Math.random() * nonTarget.length)];
    }

    // After enough wrong guesses: stumble chance — skip the target even if eligible
    if (pastMinGuesses && nonTarget.length > 0 && Math.random() < strategy.stumbleChance) {
      return nonTarget[Math.floor(Math.random() * nonTarget.length)];
    }
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Create a word-hunt strategy for a bot.
 */
export function createBotWordHuntStrategy(
  allWords: string[],
  targetLength: number,
  difficulty: string,
  targetWord: string = ''
): BotWordHuntStrategy {
  const candidates = allWords.filter(w => w.length === targetLength);
  const timing = HUNT_TIMING[difficulty] || HUNT_TIMING.medium;

  return {
    candidates,
    guessesMade: [],
    minDelay: timing.minDelay,
    maxDelay: timing.maxDelay,
    startDelay: timing.startDelay,
    minWrongGuesses: timing.minWrongGuesses,
    stumbleChance: timing.stumbleChance,
    targetWord,
  };
}

/**
 * Start bots for a Word Hunt game.
 * Each bot runs an independent guess loop with feedback-based filtering.
 */
export async function startBotsForWordHunt(
  io: Server,
  gameCode: string,
  bots: Bot[],
  huntState: WordHuntModeState,
  language: Language,
  timerSeconds: number
): Promise<void> {
  logger.info('BOT', `Starting ${bots.length} bots for Word Hunt in game ${gameCode}`);

  const game = getGame(gameCode);
  if (!game?.letterGrid) {
    logger.error('BOT', `Cannot start word-hunt bots: no grid for ${gameCode}`);
    return;
  }

  // Recovery paths (server restart/reconnect → resumeGameTimerIfMissing) relaunch
  // bots without the gameStartHandler dictionary pre-load. A cold trie → findAllWords
  // returns nothing → every bot has 0 candidates → no guesses (frozen leaderboard).
  // Warm the dict first, like the classic bot driver (botBehavior).
  await ensureLanguageLoaded(language);

  // Find all valid words on the board
  const trie = getCachedTrie(language);
  const allWords = findAllWords(game.letterGrid, language, {
    minLength: 3,
    maxLength: 8,
    maxWords: 5000,
    trie,
  });

  const gameEndTime = Date.now() + timerSeconds * 1000;

  for (const bot of bots) {
    const strategy = createBotWordHuntStrategy(allWords, huntState.targetWordLength, bot.difficulty, huntState.targetWord);

    if (strategy.candidates.length === 0) {
      logger.warn('BOT', `Bot "${bot.username}" has no word-hunt candidates (target length: ${huntState.targetWordLength})`);
      continue;
    }

    bot.isActive = true;

    // Schedule first guess — setBotTimeout auto-manages activeTimers and checks isActive
    const firstDelay = strategy.startDelay + Math.random() * 2000;
    setBotTimeout(bot, () => {
      scheduleWordHuntGuess(io, gameCode, bot, strategy, huntState, gameEndTime);
    }, firstDelay);
  }
}

/**
 * Schedule and execute a single word-hunt guess for a bot.
 */
function scheduleWordHuntGuess(
  io: Server,
  gameCode: string,
  bot: Bot,
  strategy: BotWordHuntStrategy,
  huntState: WordHuntModeState,
  gameEndTime: number
): void {
  if (!bot.isActive) return;

  const remainingMs = gameEndTime - Date.now();
  if (remainingMs <= 1000) return;

  // Check if bot is eliminated
  if (huntState.eliminatedPlayers.includes(bot.username)) {
    logger.debug('BOT', `Bot "${bot.username}" eliminated from word hunt`);
    return;
  }

  // Target already found — stop guessing
  if (huntState.targetFoundBy) return;

  // Pick a guess — avoids target until enough wrong guesses made
  const guess = pickBotGuess(strategy.candidates, bot.difficulty, strategy);
  if (!guess) {
    logger.debug('BOT', `Bot "${bot.username}" has no more word-hunt candidates`);
    return;
  }

  strategy.guessesMade.push(guess);

  // Validate guess against target
  const feedback = validateTargetGuess(huntState.targetWord, guess);
  const isCorrect = feedback.every(f => f === 'correct');

  if (isCorrect) {
    // Score cap: use buffer when no human has scored (matches Classic mode)
    const bestHuman = getBestHumanScore(gameCode);
    const result = recordTargetFound(huntState, bot.username);
    const scoreLimit = bestHuman === 0 ? BOT_SCORE_BUFFER : bestHuman;

    if (result.bonus > 0 && bot.score + result.bonus <= scoreLimit) {
      updatePlayerScore(gameCode, bot.username, result.bonus, true);
      bot.score += result.bonus;
    }

    broadcastToRoom(io, getGameRoom(gameCode), 'wordHuntTargetFound', {
      username: bot.username,
      targetWord: huntState.targetWord,
      isFirstFinder: result.isFirstFinder,
    });

    logger.info('BOT', `Bot "${bot.username}" found target "${huntState.targetWord}" in ${gameCode}`);

    // End game after delay — use setBotTimeout so it's cleaned up if bot is stopped
    setBotTimeout(bot, () => {
      const currentGame = getGame(gameCode);
      if (currentGame && currentGame.gameState === 'in-progress') {
        endGame(io, gameCode);
      }
    }, TARGET_FOUND_END_DELAY_MS);
    return;
  }

  // Broadcast bot guess to room so other players can see bot activity
  broadcastToRoom(io, getGameRoom(gameCode), 'wordHuntBotGuess', {
    username: bot.username,
    guess,
    feedback,
  });

  // Wrong guess — apply penalty and filter candidates
  const penalty = penalizeWrongGuess(huntState, bot.username);
  strategy.candidates = filterCandidatesByFeedback(strategy.candidates, guess, feedback);

  if (penalty.eliminated) {
    broadcastToRoom(io, getGameRoom(gameCode), 'wordHuntEliminated', {
      username: bot.username,
    });
    logger.info('BOT', `Bot "${bot.username}" eliminated in word hunt (wrong guess)`);
    return;
  }

  // Broadcast life update
  broadcastToRoom(io, getGameRoom(gameCode), 'wordHuntLifeUpdate', {
    playerLives: huntState.playerLives,
    eliminatedPlayers: huntState.eliminatedPlayers,
  });
  // Mark last broadcast time so gameTimer skips redundant tick broadcast
  huntState.lastLifeUpdateAt = Date.now();

  // Schedule next guess
  const delay = strategy.minDelay + Math.random() * (strategy.maxDelay - strategy.minDelay);
  if (delay > remainingMs - 1000) return;

  setBotTimeout(bot, () => {
    scheduleWordHuntGuess(io, gameCode, bot, strategy, huntState, gameEndTime);
  }, delay);
}
