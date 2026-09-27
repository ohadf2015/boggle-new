/**
 * Pure decision function to determine if an in-app review prompt should be shown.
 * No side effects — all state is passed in, nothing is read from global scope.
 */

export interface ReviewState {
  positiveMoments: number;
  lastPromptedAt: number | null;
  promptedVersions: string[];
}

export type ReviewTrigger = 'gameWin' | 'dailyStreak' | 'levelComplete';

const MINIMUM_POSITIVE_MOMENTS = 3;
const COOLDOWN_MS = 60 * 24 * 60 * 60 * 1000; // 60 days in milliseconds

/**
 * Decide whether to request a review based on engagement and history.
 *
 * @param state - Current review state from localStorage
 * @param now - Current timestamp (injected for testability)
 * @param appVersion - Current app version (injected for testability)
 * @param trigger - What triggered the check (gameWin, dailyStreak, levelComplete)
 * @returns true if review should be prompted, false otherwise
 */
export function shouldRequestReview(
  state: ReviewState,
  now: number,
  appVersion: string,
  trigger: ReviewTrigger
): boolean {
  // Must have accumulated enough positive moments
  if (state.positiveMoments < MINIMUM_POSITIVE_MOMENTS) {
    return false;
  }

  // Never prompt twice in the same app version
  if (state.promptedVersions.includes(appVersion)) {
    return false;
  }

  // Respect cooldown: only if no prior prompt, or more than 60 days have passed
  if (state.lastPromptedAt !== null) {
    const timeSinceLastPrompt = now - state.lastPromptedAt;
    if (timeSinceLastPrompt < COOLDOWN_MS) {
      return false;
    }
  }

  return true;
}
