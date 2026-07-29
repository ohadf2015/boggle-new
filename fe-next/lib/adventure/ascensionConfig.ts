/**
 * Ascension System — meta-progression for completed players.
 * 10 ascension levels with cumulative modifiers.
 */

export const MAX_ASCENSION = 10;

export interface AscensionLevel {
  level: number;
  nameKey: string;
  modifiers: AscensionModifiers;
  reward: { gold: number; titleKey: string };
}

export interface AscensionModifiers {
  /** Multiplier on boss HP (1.0 = normal) */
  bossHpMultiplier: number;
  /** Timer reduction in seconds */
  timerReduction: number;
  /** Extra objectives required for 3 stars */
  extraObjectives: number;
  /** Ice tile count multiplier */
  iceTileMultiplier: number;
  /** Minimum word length increase */
  minWordLengthBonus: number;
}

export const ASCENSION_LEVELS: AscensionLevel[] = [
  { level: 1, nameKey: 'adventure.ascension.level1', modifiers: { bossHpMultiplier: 1.1, timerReduction: 5, extraObjectives: 0, iceTileMultiplier: 1.0, minWordLengthBonus: 0 }, reward: { gold: 500, titleKey: 'adventure.ascension.title1' } },
  { level: 2, nameKey: 'adventure.ascension.level2', modifiers: { bossHpMultiplier: 1.2, timerReduction: 10, extraObjectives: 0, iceTileMultiplier: 1.2, minWordLengthBonus: 0 }, reward: { gold: 750, titleKey: 'adventure.ascension.title2' } },
  { level: 3, nameKey: 'adventure.ascension.level3', modifiers: { bossHpMultiplier: 1.35, timerReduction: 15, extraObjectives: 1, iceTileMultiplier: 1.3, minWordLengthBonus: 0 }, reward: { gold: 1000, titleKey: 'adventure.ascension.title3' } },
  { level: 4, nameKey: 'adventure.ascension.level4', modifiers: { bossHpMultiplier: 1.5, timerReduction: 20, extraObjectives: 1, iceTileMultiplier: 1.4, minWordLengthBonus: 1 }, reward: { gold: 1500, titleKey: 'adventure.ascension.title4' } },
  { level: 5, nameKey: 'adventure.ascension.level5', modifiers: { bossHpMultiplier: 1.7, timerReduction: 25, extraObjectives: 1, iceTileMultiplier: 1.5, minWordLengthBonus: 1 }, reward: { gold: 2000, titleKey: 'adventure.ascension.title5' } },
  { level: 6, nameKey: 'adventure.ascension.level6', modifiers: { bossHpMultiplier: 1.9, timerReduction: 30, extraObjectives: 2, iceTileMultiplier: 1.6, minWordLengthBonus: 1 }, reward: { gold: 2500, titleKey: 'adventure.ascension.title6' } },
  { level: 7, nameKey: 'adventure.ascension.level7', modifiers: { bossHpMultiplier: 2.1, timerReduction: 35, extraObjectives: 2, iceTileMultiplier: 1.8, minWordLengthBonus: 1 }, reward: { gold: 3000, titleKey: 'adventure.ascension.title7' } },
  { level: 8, nameKey: 'adventure.ascension.level8', modifiers: { bossHpMultiplier: 2.4, timerReduction: 40, extraObjectives: 2, iceTileMultiplier: 2.0, minWordLengthBonus: 1 }, reward: { gold: 4000, titleKey: 'adventure.ascension.title8' } },
  { level: 9, nameKey: 'adventure.ascension.level9', modifiers: { bossHpMultiplier: 2.8, timerReduction: 45, extraObjectives: 3, iceTileMultiplier: 2.2, minWordLengthBonus: 2 }, reward: { gold: 5000, titleKey: 'adventure.ascension.title9' } },
  { level: 10, nameKey: 'adventure.ascension.level10', modifiers: { bossHpMultiplier: 3.5, timerReduction: 50, extraObjectives: 3, iceTileMultiplier: 2.5, minWordLengthBonus: 2 }, reward: { gold: 10000, titleKey: 'adventure.ascension.title10' } },
];

export function getAscensionLevel(level: number): AscensionLevel | undefined {
  return ASCENSION_LEVELS.find(a => a.level === level);
}

export function getAscensionModifiers(level: number): AscensionModifiers {
  if (level <= 0) return { bossHpMultiplier: 1, timerReduction: 0, extraObjectives: 0, iceTileMultiplier: 1, minWordLengthBonus: 0 };
  const asc = ASCENSION_LEVELS.find(a => a.level === level);
  return asc?.modifiers ?? ASCENSION_LEVELS[ASCENSION_LEVELS.length - 1].modifiers;
}

/** Total gold reward for reaching a given ascension level */
export function getAscensionTotalGold(level: number): number {
  return ASCENSION_LEVELS.filter(a => a.level <= level).reduce((sum, a) => sum + a.reward.gold, 0);
}
