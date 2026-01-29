/**
 * Score Manager Module
 * Handles player scores, words, and leaderboard operations
 * Extracted from gameStateManager.js for better modularity
 */

import type { Avatar, WordDetail, LeaderboardEntry, GameUser, FirstFinderEntry } from '@/shared/types/game';

// Base game interface for scoreManager - compatible with both Game and GameState

export interface ScoreGameBase {
  users: Record<string, GameUser>;
  playerScores: Record<string, number>;
  playerWords: Record<string, string[]>;

  playerWordDetails?: Record<string, any[]>;

  playerAchievements?: Record<string, any[]>;
  playerCombos?: Record<string, number>;
  firstWordFound?: boolean;
  startTime?: number;
  /** Maps word to the first player who found it (for first-to-find scoring) */
  firstFinderMap?: Record<string, FirstFinderEntry>;
}

// Leaderboard throttling - maps gameCode to timeout ID
const leaderboardThrottleTimers: Record<string, ReturnType<typeof setTimeout>> = {};
const leaderboardLastBroadcast: Record<string, number> = {};
const leaderboardPendingUpdate: Record<string, boolean> = {};

export interface AddWordOptions {
  autoValidated?: boolean;
  validated?: boolean | null;
  score?: number;
  potentialScore?: number;
  comboBonus?: number;
  comboLevel?: number;
  fireRoundMultiplier?: number;
  fireRoundBonus?: number;
  isBot?: boolean;
}

export interface LeaderboardPlayer {
  username: string;
  score: number;
  wordCount: number;
  avatar?: Avatar;
  isHost: boolean;
  isBot: boolean;
}

/**
 * Add a word to a player's list (both playerWords and playerWordDetails)
 */
export function addPlayerWord(
  game: ScoreGameBase | null,
  username: string,
  word: string,
  options: AddWordOptions = {}
): void {
  if (!game) return;

  // Defensive check: ensure word is a valid string
  if (!word || typeof word !== 'string') {
    console.warn(`[SCORE] addPlayerWord called with invalid word: ${word} for user ${username}`);
    return;
  }

  const normalizedWord = word.toLowerCase();

  // Initialize playerWords if needed
  if (!game.playerWords[username]) {
    game.playerWords[username] = [];
  }

  // Initialize playerWordDetails if needed
  if (!game.playerWordDetails) {
    game.playerWordDetails = {};
  }
  if (!game.playerWordDetails[username]) {
    game.playerWordDetails[username] = [];
  }

  // Initialize playerAchievements if needed (important for bots and late joiners)
  if (!game.playerAchievements) {
    game.playerAchievements = {};
  }
  if (!game.playerAchievements[username]) {
    game.playerAchievements[username] = [];
  }

  // Only add if not already present
  if (!game.playerWords[username].includes(normalizedWord)) {
    game.playerWords[username].push(normalizedWord);

    // Calculate time since game start
    const currentTime = Date.now();
    const timeSinceStart = game.startTime ? (currentTime - game.startTime) / 1000 : 0;

    // Determine validated status:
    // - If explicitly provided (true/false), use it
    // - If autoValidated is true, set to true
    // - Otherwise null (pending validation)
    let validatedStatus: boolean | undefined;
    if (options.validated !== undefined && options.validated !== null) {
      validatedStatus = options.validated;
    } else if (options.autoValidated) {
      validatedStatus = true;
    } else {
      validatedStatus = undefined;
    }

    // Add to playerWordDetails for achievement tracking
    const wordDetail: WordDetail = {
      word: normalizedWord,
      score: options.score || 0,
      comboBonus: options.comboBonus || 0,
      comboLevel: options.comboLevel || 0,
      validated: validatedStatus ?? false,
      autoValidated: options.autoValidated || false,
      isDuplicate: false,
      isBot: options.isBot || false,
      fireRoundMultiplier: options.fireRoundMultiplier || 1,
      fireRoundBonus: options.fireRoundBonus || 0,
    };

    game.playerWordDetails[username].push(wordDetail);
  }
}

/**
 * Check if player already has a word
 */
export function playerHasWord(game: ScoreGameBase | null, username: string, word: string): boolean {
  if (!game) return false;
  if (!word || typeof word !== 'string') return false;
  return game.playerWords[username]?.includes(word.toLowerCase()) || false;
}

/**
 * Update player score
 */
export function updatePlayerScore(
  game: ScoreGameBase | null,
  username: string,
  score: number,
  isDelta: boolean = false
): void {
  if (!game) return;

  if (!game.playerScores[username]) {
    game.playerScores[username] = 0;
  }

  if (isDelta) {
    game.playerScores[username] += score;
  } else {
    game.playerScores[username] = score;
  }
}

/**
 * Get leaderboard for a game
 */
export function getLeaderboard(game: ScoreGameBase | null): LeaderboardPlayer[] {
  if (!game) return [];

  return Object.entries(game.playerScores)
    .map(([username, score]) => ({
      username,
      score,
      wordCount: game.playerWords[username]?.length || 0,
      avatar: game.users[username]?.avatar,
      isHost: game.users[username]?.isHost || false,
      isBot: game.users[username]?.isBot || false
    }))
    .filter(player => {
      // Filter out Host from leaderboard if they haven't found any words
      // This supports "Broadcast Mode" where the host manages the game but doesn't play
      if (player.isHost && player.wordCount === 0) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Get leaderboard with leading-edge throttling for immediate feedback
 * Uses a leading-edge pattern: broadcasts immediately on first call,
 * then throttles subsequent calls to prevent excessive updates.
 * This ensures players get immediate feedback while preventing broadcast storms.
 */
export function getLeaderboardThrottled(
  game: ScoreGameBase | null,
  gameCode: string,
  broadcastFn: ((leaderboard: LeaderboardPlayer[]) => void) | null,
  throttleMs: number = 500
): void {
  if (!game) return;

  const now = Date.now();
  const lastBroadcast = leaderboardLastBroadcast[gameCode] || 0;
  const timeSinceLastBroadcast = now - lastBroadcast;

  // If enough time has passed since last broadcast, send immediately (leading edge)
  if (timeSinceLastBroadcast >= throttleMs) {
    const leaderboard = getLeaderboard(game);
    if (broadcastFn && typeof broadcastFn === 'function') {
      broadcastFn(leaderboard);
    }
    leaderboardLastBroadcast[gameCode] = now;

    // Clear any pending trailing update since we just broadcasted
    if (leaderboardThrottleTimers[gameCode]) {
      clearTimeout(leaderboardThrottleTimers[gameCode]);
      delete leaderboardThrottleTimers[gameCode];
    }
    leaderboardPendingUpdate[gameCode] = false;
  } else {
    // Within throttle window - mark that we have a pending update
    leaderboardPendingUpdate[gameCode] = true;

    // Set a trailing-edge timer to catch any updates during the throttle window
    // Only set if not already set
    if (!leaderboardThrottleTimers[gameCode]) {
      const remainingTime = throttleMs - timeSinceLastBroadcast;
      leaderboardThrottleTimers[gameCode] = setTimeout(() => {
        // Only broadcast if there's actually a pending update
        if (leaderboardPendingUpdate[gameCode]) {
          const leaderboard = getLeaderboard(game);
          if (broadcastFn && typeof broadcastFn === 'function') {
            broadcastFn(leaderboard);
          }
          leaderboardLastBroadcast[gameCode] = Date.now();
          leaderboardPendingUpdate[gameCode] = false;
        }
        delete leaderboardThrottleTimers[gameCode];
      }, remainingTime);
    }
  }
}

/**
 * Clear leaderboard throttle state for a game
 */
export function clearLeaderboardThrottle(gameCode: string): void {
  if (leaderboardThrottleTimers[gameCode]) {
    clearTimeout(leaderboardThrottleTimers[gameCode]);
    delete leaderboardThrottleTimers[gameCode];
  }
  delete leaderboardLastBroadcast[gameCode];
  delete leaderboardPendingUpdate[gameCode];
}

/**
 * Reset player scores and words for a new round
 */
export function resetScoresForNewRound(game: ScoreGameBase | null): void {
  if (!game) return;

  // COMPLETELY clear all game data first to prevent stale data from previous games
  game.playerScores = {};
  game.playerWords = {};
  game.playerWordDetails = {};
  game.playerAchievements = {};
  game.playerCombos = {}; // Reset combo tracking for new round
  game.firstWordFound = false; // Reset FIRST_BLOOD achievement flag
  game.firstFinderMap = {}; // Reset first-finder tracking for new round

  // Re-initialize scores/words only for CURRENT players in the room
  for (const username of Object.keys(game.users)) {
    game.playerScores[username] = 0;
    game.playerWords[username] = [];
    game.playerWordDetails[username] = [];
    game.playerAchievements[username] = [];
    game.playerCombos[username] = 0; // Initialize combo tracking
  }
}

/**
 * Check if a word has already been found by another player
 * Returns the first finder's info if someone else found it, null otherwise
 */
export function getFirstFinder(
  game: ScoreGameBase | null,
  word: string,
  currentUsername: string
): FirstFinderEntry | null {
  if (!game || !word || !game.firstFinderMap) return null;

  const normalizedWord = word.toLowerCase();
  const firstFinder = game.firstFinderMap[normalizedWord];

  // Return null if no one found it yet or if current user is the first finder
  if (!firstFinder || firstFinder.username === currentUsername) {
    return null;
  }

  return firstFinder;
}

/**
 * Record a player as the first finder of a word
 * Returns true if successfully recorded (no previous finder), false if already found
 */
export function recordFirstFinder(
  game: ScoreGameBase | null,
  word: string,
  username: string,
  avatar?: Partial<Avatar> | null | undefined
): boolean {
  if (!game || !word) return false;

  // Initialize firstFinderMap if needed
  if (!game.firstFinderMap) {
    game.firstFinderMap = {};
  }

  const normalizedWord = word.toLowerCase();

  // Check if someone already found this word
  if (game.firstFinderMap[normalizedWord]) {
    return false; // Already found by someone else
  }

  // Record this player as the first finder
  game.firstFinderMap[normalizedWord] = {
    username,
    avatar: avatar || undefined,
    timestamp: Date.now(),
  };

  return true;
}

/**
 * Check if a player is the first finder of a word
 */
export function isFirstFinder(
  game: ScoreGameBase | null,
  word: string,
  username: string
): boolean {
  if (!game || !word || !game.firstFinderMap) return true; // Default to true if no tracking

  const normalizedWord = word.toLowerCase();
  const firstFinder = game.firstFinderMap[normalizedWord];

  // If no first finder recorded, this would be the first finder
  if (!firstFinder) return true;

  return firstFinder.username === username;
}

// CommonJS exports for backward compatibility
module.exports = {
  // Word management
  addPlayerWord,
  playerHasWord,

  // Score management
  updatePlayerScore,

  // Leaderboard
  getLeaderboard,
  getLeaderboardThrottled,
  clearLeaderboardThrottle,

  // Reset
  resetScoresForNewRound,

  // First-finder tracking (for first-to-find scoring)
  getFirstFinder,
  recordFirstFinder,
  isFirstFinder,
};
