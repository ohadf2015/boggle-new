/**
 * Daily Word Hunt Results Module
 *
 * This module provides extracted functionality from the DailyWordHuntResults component
 * for better maintainability and reusability.
 *
 * Module structure:
 * - types.ts           - All interfaces and types
 * - constants.ts       - Constants and helper functions
 * - icons.tsx          - Custom social media icons
 * - useShareHandlers.ts - Share functionality hook
 * - useResultSubmission.ts - Result submission hook
 * - useCoinActions.ts  - Coin spending actions hook
 * - ScoreBadge.tsx     - Header score badge component
 * - ResultDisplay.tsx  - Hero result display component
 * - CoinUnlockCard.tsx - Coin-gated action cards
 * - ShareSection.tsx   - Share buttons section
 * - AttemptHistory.tsx - in-game attempt history (not the share card)
 * - StatsSection.tsx   - Statistics with histogram
 * - SharePanel.tsx     - Share modal component
 */

// Types
export type {
  WordHuntStats,
  DailyWordHuntResultsProps,
  CoinReward,
  ResultTab,
  LanguageOption,
  ShareImageResult,
} from './types';

// Constants
export { RANK_CONFETTI_COLORS, LANGUAGE_OPTIONS, getSurvivalBonusMessage } from './constants';

// Icons
export { XTwitterIcon, WhatsAppIcon } from './icons';

// Hooks
export { useShareHandlers } from './useShareHandlers';
export { useResultSubmission } from './useResultSubmission';
export { useCoinActions } from './useCoinActions';
export { useSpendAnimation } from './useSpendAnimation';
export type { SpendAnimationPosition, UseSpendAnimationReturn } from './useSpendAnimation';
export { useStreakFreezeStatus } from './useStreakFreezeStatus';
export type { UseStreakFreezeStatusReturn } from './useStreakFreezeStatus';

// Components
export { ScoreBadge } from './ScoreBadge';
export type { ScoreBadgeProps } from './ScoreBadge';

export { ResultDisplay } from './ResultDisplay';
export type { ResultDisplayProps } from './ResultDisplay';

export { ScoreGaugeRing } from './ScoreGaugeRing';
export type { ScoreGaugeRingProps } from './ScoreGaugeRing';

export { PerformanceSection } from './PerformanceSection';
export type { PerformanceSectionProps } from './PerformanceSection';

export { CoinUnlockCard } from './CoinUnlockCard';
export type { CoinUnlockCardProps } from './CoinUnlockCard';

export { ShareSection } from './ShareSection';
export type { ShareSectionProps } from './ShareSection';

export { AttemptHistory } from './AttemptHistory';
export type { AttemptHistoryProps } from './AttemptHistory';

export { StatsSection } from './StatsSection';
export type { StatsSectionProps } from './StatsSection';

export { StatsBlurb } from './StatsBlurb';
export type { StatsBlurbProps } from './StatsBlurb';

export { RankBadge } from './RankBadge';
export type { RankBadgeProps } from './RankBadge';

export { PastPerformanceCompare } from './PastPerformanceCompare';
export type { PastPerformanceCompareProps, PerformanceComparison } from './PastPerformanceCompare';

export { SharePanel } from './SharePanel';

export { default as DailyWordHuntFacts } from './DailyWordHuntFacts';

export { StreakFreezeIndicator } from './StreakFreezeIndicator';
export type { StreakFreezeIndicatorProps } from './StreakFreezeIndicator';

