/**
 * Education Components Barrel Export
 *
 * Exports all education-related components:
 * - XP Progress UI (XpProgressBar, StreakBonusIndicator)
 * - Level Up Celebration (LevelUpCelebration)
 * - Practice Session Context (PracticeSessionProvider)
 * - Classroom Leaderboard (ClassroomLeaderboard)
 */

export { default as XpProgressBar } from './XpProgressBar';
export type { XpProgressBarProps } from './XpProgressBar';

export { default as StreakBonusIndicator } from './StreakBonusIndicator';
export type { StreakBonusIndicatorProps } from './StreakBonusIndicator';

// LevelUpCelebration is deliberately NOT re-exported here. A barrel re-export is
// as static as an import: it pulls the component into the first-load chunk of
// every page that touches this barrel, including ones that never render it.
// Import it lazily at the render site instead:
//   const LevelUpCelebration = dynamic(
//     () => import('@/components/education/LevelUpCelebration').then(m => m.LevelUpCelebration),
//     { ssr: false }
//   );
// The TYPES stay — they are erased at compile time and cost no bytes.
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

export { default as ClassroomLeaderboard } from './ClassroomLeaderboard';
export type { ClassroomLeaderboardProps } from './ClassroomLeaderboard';


export { default as EducationBadgeGrid } from './EducationBadgeGrid';
export type { StudentAchievement } from '../../types/education';

export { default as AchievementProgressCard } from './AchievementProgressCard';
export type { AchievementProgressCardProps } from './AchievementProgressCard';

export { EducationHeader } from './EducationHeader';
export { default as EducationHeaderDefault } from './EducationHeader';

export { EducationBreadcrumbs } from './EducationBreadcrumbs';
export { default as EducationBreadcrumbsDefault } from './EducationBreadcrumbs';

export { ClassroomGameLobby } from './ClassroomGameLobby';
export type { ClassroomGameLobbyProps } from './ClassroomGameLobby';

export { TeacherOnboarding } from './TeacherOnboarding';
export { default as TeacherOnboardingDefault } from './TeacherOnboarding';
export type { TeacherOnboardingProps } from './TeacherOnboarding';
