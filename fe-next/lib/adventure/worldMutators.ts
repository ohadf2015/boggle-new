/**
 * World Mutators — optional difficulty modifiers for replaying completed worlds.
 * Each mutator grants bonus gold/XP when active.
 */

export interface WorldMutator {
  id: string;
  nameKey: string;
  descriptionKey: string;
  icon: string;
  /** Gold multiplier bonus (e.g., 0.25 = +25% gold) */
  goldBonus: number;
  /** XP multiplier bonus */
  xpBonus: number;
  /** Modifier function ID — interpreted by the game engine */
  effect: MutatorEffect;
}

export type MutatorEffect =
  | 'noHints'       // Disable all hints
  | 'speedRun'      // Timer reduced by 40%
  | 'fragile'       // Player starts with 1 HP in boss fights
  | 'minimalist'    // Must complete with fewest possible words
  | 'blindMode'     // Score/objectives hidden until level end
  | 'ironMan'       // No retries — fail and you restart the world
  | 'chaosGrid'     // Grid shuffles every 20 seconds
  | 'wordMaster';   // Minimum 5-letter words only

export const WORLD_MUTATORS: WorldMutator[] = [
  { id: 'noHints', nameKey: 'adventure.mutators.noHints.name', descriptionKey: 'adventure.mutators.noHints.desc', icon: '🚫', goldBonus: 0.15, xpBonus: 0.1, effect: 'noHints' },
  { id: 'speedRun', nameKey: 'adventure.mutators.speedRun.name', descriptionKey: 'adventure.mutators.speedRun.desc', icon: '⚡', goldBonus: 0.25, xpBonus: 0.2, effect: 'speedRun' },
  { id: 'fragile', nameKey: 'adventure.mutators.fragile.name', descriptionKey: 'adventure.mutators.fragile.desc', icon: '💔', goldBonus: 0.3, xpBonus: 0.25, effect: 'fragile' },
  { id: 'minimalist', nameKey: 'adventure.mutators.minimalist.name', descriptionKey: 'adventure.mutators.minimalist.desc', icon: '✂️', goldBonus: 0.2, xpBonus: 0.15, effect: 'minimalist' },
  { id: 'blindMode', nameKey: 'adventure.mutators.blindMode.name', descriptionKey: 'adventure.mutators.blindMode.desc', icon: '🙈', goldBonus: 0.2, xpBonus: 0.15, effect: 'blindMode' },
  { id: 'ironMan', nameKey: 'adventure.mutators.ironMan.name', descriptionKey: 'adventure.mutators.ironMan.desc', icon: '💀', goldBonus: 0.5, xpBonus: 0.4, effect: 'ironMan' },
  { id: 'chaosGrid', nameKey: 'adventure.mutators.chaosGrid.name', descriptionKey: 'adventure.mutators.chaosGrid.desc', icon: '🌀', goldBonus: 0.35, xpBonus: 0.3, effect: 'chaosGrid' },
  { id: 'wordMaster', nameKey: 'adventure.mutators.wordMaster.name', descriptionKey: 'adventure.mutators.wordMaster.desc', icon: '📚', goldBonus: 0.4, xpBonus: 0.35, effect: 'wordMaster' },
];

export function getMutator(id: string): WorldMutator | undefined {
  return WORLD_MUTATORS.find(m => m.id === id);
}

/** Calculate total gold/xp bonus from active mutators */
export function getMutatorBonuses(activeIds: string[]): { goldMultiplier: number; xpMultiplier: number } {
  let goldBonus = 0;
  let xpBonus = 0;
  for (const id of activeIds) {
    const m = getMutator(id);
    if (m) {
      goldBonus += m.goldBonus;
      xpBonus += m.xpBonus;
    }
  }
  return { goldMultiplier: 1 + goldBonus, xpMultiplier: 1 + xpBonus };
}

/** Check if mutators are available for a world (must be completed first) */
export function canUseMutators(world: number, completions: Array<{ world: number; level: number; stars: number }>): boolean {
  const worldCompletions = completions.filter(c => c.world === world);
  // All 7 levels must be completed with at least 1 star
  return worldCompletions.length >= 7 && worldCompletions.every(c => c.stars >= 1);
}
