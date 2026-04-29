/**
 * Feature Gates Utility
 *
 * Controls progressive feature unlocking based on user experience level
 * Features unlock as users play more games, reducing cognitive load for beginners
 */

export interface FeatureGates {
  modeRoster: boolean; // Unlocked after 3 games — full home-screen mode list
  advancedSettings: boolean; // Unlocked after 5 games
  customBotCount: boolean; // Unlocked after 10 games
  challengeMode: boolean; // Unlocked after 15 games
  practiceMode: boolean; // Unlocked after 20 games
}

export type FeatureKey = keyof FeatureGates;

export interface UserStats {
  totalGamesPlayed: number;
}

// Feature unlock thresholds (games required)
export const THRESHOLDS = {
  modeRoster: 3,
  advancedSettings: 5,
  customBotCount: 10,
  challengeMode: 15,
  practiceMode: 20,
} as const;

/**
 * Get all feature gate statuses for a user
 *
 * @param userStats - User statistics (null/undefined treated as new user)
 * @returns Object with boolean flags for each feature
 *
 * @example
 * const gates = getFeatureGates({ totalGamesPlayed: 10 });
 * console.log(gates.advancedSettings); // true
 * console.log(gates.challengeMode); // false
 */
export function getFeatureGates(userStats: UserStats | null | undefined): FeatureGates {
  const gamesPlayed = userStats?.totalGamesPlayed ?? 0;

  return {
    modeRoster: gamesPlayed >= THRESHOLDS.modeRoster,
    advancedSettings: gamesPlayed >= THRESHOLDS.advancedSettings,
    customBotCount: gamesPlayed >= THRESHOLDS.customBotCount,
    challengeMode: gamesPlayed >= THRESHOLDS.challengeMode,
    practiceMode: gamesPlayed >= THRESHOLDS.practiceMode,
  };
}

/**
 * Check if a specific feature is unlocked for a user
 *
 * @param feature - Feature name to check
 * @param userStats - User statistics (null/undefined treated as new user)
 * @returns true if feature is unlocked, false otherwise
 *
 * @example
 * const canUseAdvanced = isFeatureUnlocked('advancedSettings', userStats);
 */
export function isFeatureUnlocked(
  feature: keyof FeatureGates,
  userStats: UserStats | null | undefined
): boolean {
  const gates = getFeatureGates(userStats);
  return gates[feature] ?? false;
}

/**
 * Get the number of games required to unlock a feature
 *
 * @param feature - Feature name
 * @returns Number of games required, or null if feature doesn't exist
 */
export function getUnlockThreshold(feature: keyof FeatureGates): number | null {
  return THRESHOLDS[feature] ?? null;
}

/**
 * Get the next feature that will be unlocked for a user
 *
 * @param userStats - User statistics
 * @returns Next feature to unlock and games remaining, or null if all unlocked
 */
export function getNextUnlock(
  userStats: UserStats | null | undefined
): { feature: keyof FeatureGates; gamesRemaining: number } | null {
  const gamesPlayed = userStats?.totalGamesPlayed ?? 0;
  const gates = getFeatureGates(userStats);

  // Find first locked feature
  for (const [feature, isUnlocked] of Object.entries(gates)) {
    if (!isUnlocked) {
      const threshold = THRESHOLDS[feature as keyof FeatureGates];
      return {
        feature: feature as keyof FeatureGates,
        gamesRemaining: threshold - gamesPlayed,
      };
    }
  }

  return null; // All features unlocked
}
