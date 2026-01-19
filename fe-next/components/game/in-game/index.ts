/**
 * InGameScreen Module
 *
 * Extracted components and hooks from InGameScreen.tsx for better maintainability.
 *
 * Module structure:
 * - types.ts - All interfaces and types
 * - hooks/ - Custom hooks for game logic
 * - components/ - Sub-components for UI sections
 */

// Types
export type {
  HintsState,
  InGameScreenProps,
  EarthquakeState,
  MobileTab,
  TranslationFn,
  TappedCellPosition,
} from './types';

// Hooks
export {
  useWordSubmission,
  useEarthquakeEffects,
  useViewportTracking,
  useSocketFeedback,
} from './hooks';

// Components
export {
  GameOverlays,
  GameHeader,
  GameLeaderboard,
  GameWordList,
  ScoreDisplay,
  LandscapeLayout,
} from './components';
