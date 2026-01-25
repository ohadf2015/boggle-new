/**
 * Education Components Barrel Export
 *
 * Exports all education-related components:
 * - XP Progress UI (XpProgressBar, StreakBonusIndicator)
 * - Level Up Celebration (LevelUpCelebration)
 * - Practice Session Context (PracticeSessionProvider)
 */

export { default as XpProgressBar } from './XpProgressBar';
export type { XpProgressBarProps } from './XpProgressBar';

export { default as StreakBonusIndicator } from './StreakBonusIndicator';
export type { StreakBonusIndicatorProps } from './StreakBonusIndicator';

export { LevelUpCelebration } from './LevelUpCelebration';
export type { LevelUpCelebrationProps, LevelUpPayload } from './LevelUpCelebration';

export {
  PracticeSessionProvider,
  usePracticeSession,
} from './PracticeSessionProvider';
export type {
  PracticeSessionContextValue,
  PracticeSessionProviderProps,
  CompletePracticeSessionData,
} from './PracticeSessionProvider';
