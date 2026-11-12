import { publishLevelUp } from '@/lib/avatar/revealTrigger';

let held: { oldLevel: number; newLevel: number } | null = null;

/** A mid-run celebration would open over the chest that gates Continue, so the run's level-ups wait for its last screen. */
export function holdAdventureLevelUp(levelUp: { newLevel: number; levelsGained: number } | null | undefined, runEnded: boolean): void {
  if (levelUp) {
    const oldLevel = levelUp.newLevel - levelUp.levelsGained;
    held = { oldLevel: Math.min(held?.oldLevel ?? oldLevel, oldLevel), newLevel: Math.max(held?.newLevel ?? 0, levelUp.newLevel) };
  }
  if (runEnded && held) {
    publishLevelUp(held, 'adventure');
    held = null;
  }
}
