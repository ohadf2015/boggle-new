/**
 * Results Components - Reusable components for game results display
 *
 * These components are shared between:
 * - SinglePlayerResults (single player games)
 * - ResultsPage (multiplayer games)
 * - DailyChallengeResults (daily challenges)
 * - DailyWordHuntResults (word hunt mode)
 */

// ============================================================
// SHARED DISPLAY COMPONENTS
// ============================================================

export { default as StatsGrid, createGameStats } from './StatsGrid';
export type { StatItem, GameStatsConfig } from './StatsGrid';

export { default as CompactResultsStats } from './CompactResultsStats';

export { default as BonusBadgesRow } from './BonusBadgesRow';

export { default as CoinRewardDisplay } from './CoinRewardDisplay';
export type { CoinReward, CoinRewardMode } from './CoinRewardDisplay';

export { ResultsActionButtons } from './ResultsActionButtons';

export { default as ResultsWinnerBanner } from './ResultsWinnerBanner';

export { default as Top3Leaderboard } from './Top3Leaderboard';

export { default as PlayerArchetypeBadge } from './PlayerArchetypeBadge';

export { default as PlayerInsights } from './PlayerInsights';

export { default as MissedWords } from './MissedWords';

// Dynamic import to save ~150KB on non-stats pages
export { default as PerformanceChart } from './PerformanceChartDynamic';

export { default as ShareWinPrompt } from './ShareWinPrompt';

export { default as PlayersReadyIndicator } from './PlayersReadyIndicator';

export { default as NoWordsFoundView } from './NoWordsFoundView';

export { default as XpBreakdownCard } from './XpBreakdownCard';

export { default as WinStreakDisplay } from './WinStreakDisplay';

export { default as ConfettiRetrigger } from './ConfettiRetrigger';

export { default as AutoRejoinTimer } from './AutoRejoinTimer';

export { default as ValidationModal } from './ValidationModal';

// ============================================================
// WORD DISPLAY COMPONENTS
// ============================================================

export { WordPointsGroup, SharedWordsSection, InvalidWordsSection } from './WordPointsGroup';

export { default as WordChip } from './WordChip';

// ============================================================
// PLAYER CARD COMPONENTS
// ============================================================

export { default as ConsolidatedPlayerCard } from './ConsolidatedPlayerCard';

export { default as ResultsPlayerCard } from './ResultsPlayerCard';

export { default as YourQuickStats } from './YourQuickStats';

// ============================================================
// HOOKS
// ============================================================

export { default as useWordCategories, useWordCategories as useWordCategoriesHook } from './useWordCategories';
export type { UseWordCategoriesResult } from './useWordCategories';

export { default as useGameResults, useGameResults as useGameResultsHook } from './useGameResults';
export type { GameResultsConfig, GameResultsData } from './useGameResults';

export { default as useResultsSocketEvents, useResultsSocketEvents as useResultsSocketEventsHook } from './useResultsSocketEvents';
export type { ResultsSocketEventsState, ResultsSocketEventsActions, UseResultsSocketEventsProps } from './useResultsSocketEvents';

// ============================================================
// UTILITIES
// ============================================================

export { getPointColor, getTextColor, filterGameAchievements, categorizeWords, calculateWordStats } from './utils';

// ============================================================
// TYPES
// ============================================================

export type {
  WordObject,
  Player,
  Title,
  GameAchievement,
  XpGainedData,
  LevelUpData,
  ResultsPlayerCardProps,
  WordChipProps,
} from './types';
