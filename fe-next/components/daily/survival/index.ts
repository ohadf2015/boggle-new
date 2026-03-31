/**
 * Daily Word Hunt Survival Mode Module
 *
 * Extracted types, constants, hooks, and components from DailyWordHuntSurvival.tsx
 * for better maintainability and reusability.
 *
 * Module structure:
 * - types.ts                    - All interfaces and types
 * - constants.ts                - Game constants and thresholds
 * - useSurvivalGameLogic.ts     - Custom hook for game state and logic
 * - SurvivalHeader.tsx          - Header with quit and tokens display
 * - SurvivalLifeBar.tsx         - Life bar with animations
 * - SurvivalClueBoxes.tsx       - Hint boxes with feedback overlay
 * - SurvivalGridSection.tsx     - Grid wrapper with protection
 * - SurvivalLandscapeLayout.tsx - Landscape mode layout
 *
 * Note: Shop has been removed - clues now auto-unlock as tokens are earned
 */

// Types
export type {
  DailyWordHuntSurvivalProps,
  WordDiscovery,
  TargetAttempt,
  SurvivalGameResult,
  AccumulatedClue,
  ScoreEvent,
  AutoClueNotificationData,
} from './types';

// Constants
export {
  MAX_ATTEMPTS,
  INITIAL_LIFE,
  LIFE_DRAIN_RATE,
  INVALID_WORD_PENALTY,
  NOT_IN_DICTIONARY_PENALTY,
  HALF_LIFE_THRESHOLD,
  MIN_TOKENS_FOR_HINT,
  FEEDBACK_OVERLAY_DURATION,
  SHOP_HINT_DISMISS_DELAY,
} from './constants';

// Hooks
export { useSurvivalGameLogic } from './useSurvivalGameLogic';
export type { SurvivalGameState, SurvivalGameActions, UseSurvivalGameLogicProps } from './useSurvivalGameLogic';

export { useSurvivalClues } from './useSurvivalClues';
export type { ClueState, ClueActions, UseSurvivalCluesProps } from './useSurvivalClues';

export { useSurvivalHints } from './useSurvivalHints';
export type { HintState, HintActions, UseSurvivalHintsProps } from './useSurvivalHints';

// Components
export { SurvivalHeader } from './SurvivalHeader';
export type { SurvivalHeaderProps } from './SurvivalHeader';

export { SurvivalLifeBar } from './SurvivalLifeBar';
export type { SurvivalLifeBarProps } from './SurvivalLifeBar';

export { SurvivalClueBoxes } from './SurvivalClueBoxes';
export type { SurvivalClueBoxesProps } from './SurvivalClueBoxes';

// SurvivalClueShop removed - clues now auto-unlock as tokens are earned

export { SurvivalGridSection } from './SurvivalGridSection';
export type { SurvivalGridSectionProps } from './SurvivalGridSection';

export { AccumulatedScoreDisplay } from './AccumulatedScoreDisplay';
export type { AccumulatedScoreDisplayProps } from './AccumulatedScoreDisplay';

export { AutoClueNotification } from './AutoClueNotification';
export type { AutoClueNotificationProps } from './AutoClueNotification';

export { useLiveScoreTracker } from './useLiveScoreTracker';
export type { LiveScoreState, LiveScoreActions, UseLiveScoreTrackerProps } from './useLiveScoreTracker';

export { SurvivalDesktopLayout } from './SurvivalDesktopLayout';
export type { SurvivalDesktopLayoutProps } from './SurvivalDesktopLayout';

export { SurvivalLiveRanks } from './SurvivalLiveRanks';
export type { SurvivalLiveRanksProps } from './SurvivalLiveRanks';

export { SurvivalLootPanel } from './SurvivalLootPanel';
export type { SurvivalLootPanelProps } from './SurvivalLootPanel';

export { SurvivalMobileInfoBar } from './SurvivalMobileInfoBar';
export type { SurvivalMobileInfoBarProps } from './SurvivalMobileInfoBar';
