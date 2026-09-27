/**
 * Registry of in-app HIDDEN achievements (easter eggs) for classic single-player.
 *
 * These are secret play-pattern surprises — distinct from the visible
 * `FirstTimeAchievement` milestones and from native PGS achievements. Pure data:
 * detection (detectHiddenAchievements.ts), dedup (hiddenAchievementState.ts) and
 * surfacing (hiddenAchievementBus.ts + HiddenAchievementListener.tsx) live elsewhere.
 *
 * Titles/descriptions are i18n keys resolved with t() at render time, never
 * hardcoded strings.
 */

export type HiddenAchievementId =
  | 'board_sweep'
  | 'palindrome'
  | 'speed_demon'
  | 'triple_threat';

export interface HiddenAchievement {
  id: HiddenAchievementId;
  emoji: string;
  /** i18n key for the short title shown in the reveal card. */
  titleKey: string;
  /** i18n key for the one-line "how you earned it" description. */
  descKey: string;
  /** Tailwind gradient class pair for the card (neo-brutalist palette). */
  color: string;
}

export const HIDDEN_ACHIEVEMENTS: readonly HiddenAchievement[] = [
  {
    id: 'board_sweep',
    emoji: '🧹',
    titleKey: 'hiddenAchievement.board_sweep.title',
    descKey: 'hiddenAchievement.board_sweep.desc',
    color: 'from-neo-lime to-neo-cyan',
  },
  {
    id: 'palindrome',
    emoji: '🔄',
    titleKey: 'hiddenAchievement.palindrome.title',
    descKey: 'hiddenAchievement.palindrome.desc',
    color: 'from-neo-purple to-neo-pink',
  },
  {
    id: 'speed_demon',
    emoji: '⚡',
    titleKey: 'hiddenAchievement.speed_demon.title',
    descKey: 'hiddenAchievement.speed_demon.desc',
    color: 'from-neo-orange to-neo-pink',
  },
  {
    id: 'triple_threat',
    emoji: '🎰',
    titleKey: 'hiddenAchievement.triple_threat.title',
    descKey: 'hiddenAchievement.triple_threat.desc',
    color: 'from-neo-cyan to-neo-purple',
  },
] as const;

const BY_ID: Record<string, HiddenAchievement> = Object.fromEntries(
  HIDDEN_ACHIEVEMENTS.map((a) => [a.id, a]),
);

export function getHiddenAchievement(id: string): HiddenAchievement | undefined {
  return BY_ID[id];
}
