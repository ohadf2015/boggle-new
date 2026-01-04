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
 * - TryAnotherLanguage.tsx - Language switching component
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

// Components
export { TryAnotherLanguage } from './TryAnotherLanguage';
export { SharePanel } from './SharePanel';
