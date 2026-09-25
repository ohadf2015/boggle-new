/**
 * Word Hunt bot rules.
 *
 * Word Hunt bots do two things: find BOARD words (the shared board-word bot,
 * priced with the per-letter board bonus and restoring life, exactly like a
 * human's board word) and hunt the TARGET with Wordle-style guesses, filtering
 * a candidate list by feedback. Both run on the shared bot engine; the target
 * bonus goes through the same score gate and event-bonus credit as a human's.
 */

import type { Server } from 'socket.io';
import type { Language, LetterFeedback, WordHuntModeState } from '@/shared/types/game';
import type { Bot } from '../../modules/botBehavior';
import {
  validateTargetGuess,
  recordTargetFound,
  penalizeWrongGuess,
  restoreLife,
  getLifeBonus,
} from '../../modules/wordHuntManager';
import { getGame } from '../../modules/gameStateManager';
import { broadcastToRoom, getGameRoom } from '../../utils/socketHelpers';
import { findAllWords, getCachedTrie } from '../../modules/boggleSolver';
import { BOARD_WORD_SCORE_PER_LETTER } from '@/shared/constants/wordHuntMultiplayerConstants';
import { endGame } from './gameEnd';
import { setBotTimeout } from '../../modules/botLifecycle';
import { ensureLanguageLoaded } from '../../dictionary';
import logger from '../../utils/logger';
import { creditBotBonus, runBotLoop, type BotPlayRules, type BotRoundContext } from './botEngine';
import { quoteBoardWord } from './botClassic';

/** Delay before ending game after bot finds target (ms) */
const TARGET_FOUND_END_DELAY_MS = 3000;

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

/** Broadcast the room's lives right away (the timer tick skips a fresh broadcast). */
function broadcastLives(io: Server, gameCode: string, huntState: WordHuntModeState): void {
  broadcastToRoom(io, getGameRoom(gameCode), 'wordHuntLifeUpdate', {
    playerLives: huntState.playerLives,
    eliminatedPlayers: huntState.eliminatedPlayers,
  });
  huntState.lastLifeUpdateAt = Date.now();
}

/**
 * Board words in Word Hunt: a classic board word plus the per-letter board
 * bonus (credited live and kept as an event bonus, like the human path), and it
 * restores the bot's life.
 */
export function wordHuntBoardRules(huntState: WordHuntModeState): BotPlayRules {
  return {
    quote(ctx: BotRoundContext, bot: Bot, word: string) {
      const base = quoteBoardWord(ctx, bot, word);
      if (!base) return null;
      return {
        wordScore: base.wordScore,
        eventBonus: word.length * BOARD_WORD_SCORE_PER_LETTER,
        commit: () => {
          restoreLife(huntState, bot.username, getLifeBonus(word.length));
          broadcastLives(ctx.io, ctx.gameCode, huntState);
        },
      };
    },
  };
}

/** One target guess. Returns false once the bot is done hunting. */
function takeTargetGuess(ctx: BotRoundContext, bot: Bot, strategy: BotWordHuntStrategy, huntState: WordHuntModeState): boolean {
  const { io, gameCode } = ctx;
  if (huntState.eliminatedPlayers.includes(bot.username) || huntState.targetFoundBy) return false;

  // Avoids the target until enough wrong guesses, then may still stumble past it.
  const guess = pickBotGuess(strategy.candidates, bot.difficulty, strategy);
  if (!guess) return false;
  strategy.guessesMade.push(guess);

  const feedback = validateTargetGuess(huntState.targetWord, guess);
  if (feedback.every((f) => f === 'correct')) {
    // Bot guesses live on strategy.guessesMade (not huntState.playerAttempts),
    // so pass the count explicitly for the guess-efficiency bonus.
    const result = recordTargetFound(huntState, bot.username, strategy.guessesMade.length);
    creditBotBonus(ctx, bot, result.bonus);
    broadcastToRoom(io, getGameRoom(gameCode), 'wordHuntTargetFound', {
      username: bot.username,
      targetWord: huntState.targetWord,
      isFirstFinder: result.isFirstFinder,
    });
    logger.info('BOT', `Bot "${bot.username}" found target "${huntState.targetWord}" in ${gameCode}`);
    // End the round shortly after (cleared with the bot if it is stopped first).
    setBotTimeout(bot, () => {
      if (getGame(gameCode)?.gameState === 'in-progress') endGame(io, gameCode);
    }, TARGET_FOUND_END_DELAY_MS);
    return false;
  }

  broadcastToRoom(io, getGameRoom(gameCode), 'wordHuntBotGuess', { username: bot.username, guess, feedback });
  const penalty = penalizeWrongGuess(huntState, bot.username);
  strategy.candidates = filterCandidatesByFeedback(strategy.candidates, guess, feedback);
  if (penalty.eliminated) {
    broadcastToRoom(io, getGameRoom(gameCode), 'wordHuntEliminated', { username: bot.username });
    logger.info('BOT', `Bot "${bot.username}" eliminated in word hunt (wrong guess)`);
    return false;
  }
  broadcastLives(io, gameCode, huntState);
  return true;
}

/**
 * Start the target-guessing loop for Word Hunt bots (board words run alongside
 * via the board-word bot with `wordHuntBoardRules`).
 */
export async function startBotsForWordHunt(
  io: Server,
  gameCode: string,
  bots: Bot[],
  huntState: WordHuntModeState,
  language: Language,
  timerSeconds: number,
): Promise<void> {
  logger.info('BOT', `Starting ${bots.length} bots for Word Hunt in game ${gameCode}`);
  const game = getGame(gameCode);
  if (!game?.letterGrid) {
    logger.error('BOT', `Cannot start word-hunt bots: no grid for ${gameCode}`);
    return;
  }

  // Recovery paths relaunch bots without the start handler's dictionary load:
  // a cold trie finds nothing and every bot would have 0 candidates.
  await ensureLanguageLoaded(language);
  const trie = getCachedTrie(language);
  const allWords = findAllWords(game.letterGrid, language, { minLength: 3, maxLength: 8, maxWords: 5000, trie });

  const ctx: BotRoundContext = { io, gameCode, language, gameEndTime: Date.now() + timerSeconds * 1000 };
  for (const bot of bots) {
    const strategy = createBotWordHuntStrategy(allWords, huntState.targetWordLength, bot.difficulty, huntState.targetWord);
    if (strategy.candidates.length === 0) {
      logger.warn('BOT', `Bot "${bot.username}" has no word-hunt candidates (target length: ${huntState.targetWordLength})`);
      continue;
    }
    // Not activateBot(): the board-word loop for this bot may already be armed.
    bot.isActive = true;
    runBotLoop(ctx, bot, {
      firstDelay: () => strategy.startDelay + Math.random() * 2000,
      nextDelay: () => strategy.minDelay + Math.random() * (strategy.maxDelay - strategy.minDelay),
      step: () => takeTargetGuess(ctx, bot, strategy, huntState),
    });
  }
}
