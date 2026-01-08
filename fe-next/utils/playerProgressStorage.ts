/**
 * Player Progress Storage
 * Tracks training game progress to enable progressive mode discovery
 */

import { getGuestStats } from './guestManager';
import { getJsonFromLocalStorage, saveJsonToLocalStorage, removeFromLocalStorage } from './storageHelpers';

const STORAGE_KEY = 'lexiclash_player_progress';
const GAMES_BEFORE_PROMPT = 2; // Show mode discovery after 2 training games

export interface PlayerProgress {
  trainingGamesPlayed: number;
  hasSeenModePrompt: boolean;
  promptDismissedAt: string | null;
  firstGameAt: string | null;
}

const DEFAULT_PROGRESS: PlayerProgress = {
  trainingGamesPlayed: 0,
  hasSeenModePrompt: false,
  promptDismissedAt: null,
  firstGameAt: null,
};

/**
 * Get current player progress from localStorage
 */
export const getPlayerProgress = (): PlayerProgress => {
  const stored = getJsonFromLocalStorage<Partial<PlayerProgress>>(STORAGE_KEY, {});
  return { ...DEFAULT_PROGRESS, ...stored };
};

/**
 * Save player progress to localStorage
 */
const savePlayerProgress = (progress: PlayerProgress): void => {
  saveJsonToLocalStorage(STORAGE_KEY, progress);
};

/**
 * Increment training games counter
 * Call this when a single player / practice game ends
 */
export const incrementTrainingGames = (): void => {
  const progress = getPlayerProgress();

  progress.trainingGamesPlayed += 1;

  if (!progress.firstGameAt) {
    progress.firstGameAt = new Date().toISOString();
  }

  savePlayerProgress(progress);
};

/**
 * Get the number of training games played
 */
export const getTrainingGamesCount = (): number => {
  return getPlayerProgress().trainingGamesPlayed;
};

/**
 * Check if we should show the mode discovery prompt
 * Returns true after GAMES_BEFORE_PROMPT games AND if not dismissed recently
 */
export const shouldShowModePrompt = (): boolean => {
  const progress = getPlayerProgress();

  // Not enough games yet
  if (progress.trainingGamesPlayed < GAMES_BEFORE_PROMPT) {
    return false;
  }

  // Already shown and dismissed
  if (progress.hasSeenModePrompt && progress.promptDismissedAt) {
    // Allow re-showing after 24 hours
    const dismissedAt = new Date(progress.promptDismissedAt);
    const hoursSinceDismiss = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceDismiss < 24) {
      return false;
    }
  }

  return true;
};

/**
 * Mark the mode prompt as seen (will still show until dismissed)
 */
export const markModePromptSeen = (): void => {
  const progress = getPlayerProgress();
  progress.hasSeenModePrompt = true;
  savePlayerProgress(progress);
};

/**
 * Dismiss the mode discovery prompt
 * Won't show again for 24 hours
 */
export const dismissModePrompt = (): void => {
  const progress = getPlayerProgress();
  progress.hasSeenModePrompt = true;
  progress.promptDismissedAt = new Date().toISOString();
  savePlayerProgress(progress);
};

/**
 * Reset progress (for testing/debugging)
 */
export const resetPlayerProgress = (): void => {
  removeFromLocalStorage(STORAGE_KEY);
};

/**
 * Check if player is still in "new player" phase
 * Returns true if they haven't played enough games yet
 */
export const isNewPlayer = (): boolean => {
  return getTrainingGamesCount() < GAMES_BEFORE_PROMPT;
};

/**
 * Check if player has played ANY game across all modes
 * Uses guestManager stats which track all games (singleplayer, multiplayer, daily)
 * Returns true if they have played at least one game
 */
export const hasPlayedAnyGame = (): boolean => {
  if (typeof window === 'undefined') return true; // Assume played during SSR

  try {
    const guestStats = getGuestStats();
    return guestStats.games > 0;
  } catch {
    // Fallback to training games if guestStats fails
    return getTrainingGamesCount() > 0;
  }
};

/**
 * Check if training suggestion was already skipped this session
 * Uses sessionStorage so it resets when browser closes
 */
const TRAINING_SUGGESTION_SKIPPED_KEY = 'lexiclash_training_suggestion_skipped';

export const hasSkippedTrainingSuggestion = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(TRAINING_SUGGESTION_SKIPPED_KEY) === 'true';
  } catch {
    return false;
  }
};

export const markTrainingSuggestionSkipped = (): void => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(TRAINING_SUGGESTION_SKIPPED_KEY, 'true');
  } catch {
    // Ignore storage errors
  }
};
