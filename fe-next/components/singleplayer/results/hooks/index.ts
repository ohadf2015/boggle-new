/**
 * Single Player Results Hooks - barrel exports
 *
 * Custom hooks for managing side effects in SinglePlayerResults component.
 * Each hook handles a specific concern like stats sync, rewards, or tracking.
 */

export { useGuestStatsSync } from './useGuestStatsSync';
export { useLeaderboardSync } from './useLeaderboardSync';
export { useGameHistory } from './useGameHistory';
export { useGameSessionLogging } from './useGameSessionLogging';
export { useCoinRewards } from './useCoinRewards';
export { useWinStreakTracking, type WinStreakDisplayData } from './useWinStreakTracking';
export { useCognitiveScoring, type BrainPointsReward } from './useCognitiveScoring';
export { useSignupPrompt } from './useSignupPrompt';
export { useSharePromptImpression } from './useSharePromptImpression';
export { useAchievementsSave } from './useAchievementsSave';
export { useWordValidation } from './useWordValidation';
export { useBannerConfig } from './useBannerConfig';
