'use client';

/**
 * Hook for CrazyGames platform utilities.
 *
 * NOTE: Platform-level settings (audio mute, chat disable) are NOT exposed
 * by the CrazyGames SDK v3 API. This hook provides utility functions only.
 *
 * @example
 * ```tsx
 * // This hook is currently a placeholder
 * // Platform settings aren't available via CrazyGames SDK
 * const {} = useCrazyGamesSettings();
 * ```
 */
export function useCrazyGamesSettings() {
  // NOTE: CrazyGames SDK does not expose platform settings like
  // muteAudio or disableChat. These were planned features but don't
  // exist in the actual SDK API (verified in CrazyGamesSDK.tsx types).
  //
  // Audio muting is handled by individual ad callbacks in useCrazyGamesAds.
  // Chat features should be controlled by game logic, not platform settings.

  return {};
}

/**
 * Trigger a happytime event to CrazyGames SDK.
 * Call this on major player achievements:
 * - Boss defeats
 * - High scores
 * - Level 10+ completion
 * - First boss battle victory
 *
 * @example
 * ```tsx
 * // On boss defeat
 * if (bossPhase === 'victory') {
 *   await triggerHappytime();
 * }
 * ```
 */
export async function triggerHappytime() {
  if (typeof window === 'undefined' || !window.CrazyGames?.SDK) {
    return;
  }

  try {
    window.CrazyGames.SDK.game.happyTime();
  } catch (error) {
    // Silently fail if SDK not available
  }
}

export default useCrazyGamesSettings;
