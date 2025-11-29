/**
 * Achievement Components - React Native
 * Ported from fe-next/components/achievements/
 *
 * Neo-brutalist achievement system with:
 * - AchievementBadge: Compact badge display with tooltip
 * - AchievementPopup: Full-screen animated notification
 * - AchievementQueue: Sequential achievement display manager
 * - AchievementDock: Trophy button with expandable achievement list
 */

export { AchievementBadge } from './AchievementBadge';
export { default as AchievementPopup } from './AchievementPopup';
export {
  default as AchievementQueue,
  AchievementQueueProvider,
  useAchievementQueue,
} from './AchievementQueue';
export { default as AchievementDock } from './AchievementDock';

export type { Achievement } from './AchievementBadge';
