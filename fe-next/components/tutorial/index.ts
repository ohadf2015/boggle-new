/**
 * Tutorial System
 * Interactive tutorial that guides new players through their first game
 *
 * Usage:
 * 1. Wrap your app with TutorialProvider
 * 2. Add TutorialOverlay inside the provider
 * 3. Add data-tutorial attributes to target elements
 * 4. Use useTutorial hook to control the tutorial programmatically
 *
 * @example
 * // In your layout or app component:
 * <TutorialProvider autoStart={true}>
 *   <TutorialOverlay />
 *   <YourApp />
 * </TutorialProvider>
 *
 * // Add data-tutorial attributes to target elements:
 * <div data-tutorial="grid">...</div>
 * <div data-tutorial="timer">...</div>
 * <div data-tutorial="leaderboard">...</div>
 *
 * // Use the hook to control the tutorial:
 * const { isActive, startTutorial, skipTutorial } = useTutorial();
 */

// Context and Provider
export { TutorialProvider, TutorialContext } from './TutorialProvider';
export type { TutorialContextValue } from './TutorialProvider';

// Components
export { default as TutorialOverlay } from './TutorialOverlay';
export { default as TutorialTooltip } from './TutorialTooltip';

// Hook
export { useTutorial } from './useTutorial';

// Tutorial step definitions and utilities
export {
  tutorialSteps,
  TUTORIAL_STORAGE_KEY,
  isTutorialCompleted,
  markTutorialCompleted,
  resetTutorial,
} from './tutorialSteps';
export type { TutorialStep } from './tutorialSteps';
