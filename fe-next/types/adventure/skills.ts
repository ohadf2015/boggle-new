/**
 * Skill tree progression types.
 */

/**
 * Paths:
 * - power: offensive bonuses, damage multipliers
 * - strategy: board manipulation, combo enhancement
 * - utility: QoL, power-up improvements
 */
export type SkillPath = 'power' | 'strategy' | 'utility';

/** horizontal = strategy (75%), vertical = stat boost (25%) */
export type SkillEffectType = 'horizontal' | 'vertical';

export interface SkillNode {
  id: string;
  nameKey: string;
  descriptionKey: string;
  path: SkillPath;
  tier: 1 | 2 | 3;
  cost: number;
  prerequisites: string[];
  effectId: string;
  effectType: SkillEffectType;
  icon: string;
}

export interface SkillTreeState {
  unlockedSkills: Set<string>;
  availablePoints: number;
  totalPointsEarned: number;
}
