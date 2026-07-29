/**
 * Runtime wrapper for requesting reviews.
 * Manages localStorage state and triggers native review prompt via Capacitor.
 *
 * Web: no-op (returns silently)
 * Native (iOS/Android): triggers system review dialog
 */

import { Capacitor } from '@capacitor/core';
import { shouldRequestReview, type ReviewState, type ReviewTrigger } from './shouldRequestReview';

const STORAGE_KEY = 'lexiclash_review_state';

function getStorageState(): ReviewState {
  if (typeof window === 'undefined') {
    return { positiveMoments: 0, lastPromptedAt: null, promptedVersions: [] };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { positiveMoments: 0, lastPromptedAt: null, promptedVersions: [] };
    return JSON.parse(stored);
  } catch {
    return { positiveMoments: 0, lastPromptedAt: null, promptedVersions: [] };
  }
}

function saveStorageState(state: ReviewState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore localStorage write failures
  }
}

async function triggerNativeReview(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return; // No-op on web
  }

  try {
    // Dynamic import to prevent web bundle breakage
    const { InAppReview } = await import('@capacitor-community/in-app-review');
    await InAppReview.requestReview();
  } catch (err) {
    // Silently fail if plugin unavailable or native call fails
    console.debug('In-app review failed:', err);
  }
}

/**
 * Increment positive moments for the current session.
 * Called when game wins, daily streaks, level completions occur.
 * Use this to track cumulative engagement without triggering review.
 */
export function trackPositiveMoment(): void {
  const state = getStorageState();
  state.positiveMoments = (state.positiveMoments || 0) + 1;
  saveStorageState(state);
}

/**
 * Attempt to request a review if conditions are met.
 * Safe to call frequently — will only trigger native prompt once per app version + 60 days.
 *
 * @param trigger - What triggered the check (gameWin, dailyStreak, levelComplete)
 */
export async function maybeRequestReview(trigger: ReviewTrigger): Promise<void> {
  // Only run on native platforms
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  const state = getStorageState();
  const now = Date.now();

  // Get app version from package.json or fallback
  const appVersion = (globalThis as any).__APP_VERSION__ || '1.0.0';

  // Check if we should request
  if (!shouldRequestReview(state, now, appVersion, trigger)) {
    return;
  }

  // Trigger the native review prompt
  await triggerNativeReview();

  // Mark that we prompted in this version + timestamp
  state.lastPromptedAt = now;
  state.promptedVersions = [...new Set([...state.promptedVersions, appVersion])];
  saveStorageState(state);
}

/**
 * Reset review state (for testing or user request).
 */
export function resetReviewState(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}
