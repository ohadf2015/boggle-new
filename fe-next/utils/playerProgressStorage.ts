/**
 * Player Progress Storage
 * Tracks training game progress to enable progressive mode discovery
 */

const STORAGE_KEY = 'lexiclash_player_progress';
const GAMES_BEFORE_PROMPT = 2; // Show mode discovery after 2 training games

export interface PlayerProgress {
  trainingGamesPlayed: number;
  hasSeenModePrompt: boolean;
  promptDismissedAt: string | null;
  firstGameAt: string | null;
}

const getDefaultProgress = (): PlayerProgress => ({
  trainingGamesPlayed: 0,
  hasSeenModePrompt: false,
  promptDismissedAt: null,
  firstGameAt: null,
});

/**
 * Get current player progress from localStorage
 */
export const getPlayerProgress = (): PlayerProgress => {
  if (typeof window === 'undefined') return getDefaultProgress();

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return getDefaultProgress();
    return { ...getDefaultProgress(), ...JSON.parse(stored) };
  } catch {
    return getDefaultProgress();
  }
};

/**
 * Save player progress to localStorage
 */
const savePlayerProgress = (progress: PlayerProgress): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
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
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
};

/**
 * Check if player is still in "new player" phase
 * Returns true if they haven't played enough games yet
 */
export const isNewPlayer = (): boolean => {
  return getTrainingGamesCount() < GAMES_BEFORE_PROMPT;
};
