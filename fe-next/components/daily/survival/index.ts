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
 * - SurvivalHeader.tsx          - Header with quit, tokens, shop
 * - SurvivalLifeBar.tsx         - Life bar with animations
 * - SurvivalClueBoxes.tsx       - Hint boxes with feedback overlay
 * - SurvivalClueShop.tsx        - Shop modal for purchasing hints
 * - SurvivalGridSection.tsx     - Grid wrapper with protection
 * - SurvivalLandscapeLayout.tsx - Landscape mode layout
 */

// Types
export type {
  DailyWordHuntSurvivalProps,
  WordDiscovery,
  TargetAttempt,
  SurvivalGameResult,
  AccumulatedClue,
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

export { SurvivalClueShop } from './SurvivalClueShop';
export type { SurvivalClueShopProps } from './SurvivalClueShop';

export { SurvivalGridSection } from './SurvivalGridSection';
export type { SurvivalGridSectionProps } from './SurvivalGridSection';

export { SurvivalLandscapeLayout } from './SurvivalLandscapeLayout';
export type { SurvivalLandscapeLayoutProps } from './SurvivalLandscapeLayout';
