/**
 * Objective generation for adventure levels.
 * Split from levelConfig.ts — boss/archetype-driven primary + secondary selection.
 */

import type {
  LevelObjective,
  ObjectiveType,
  LevelArchetype,
} from '@/types/adventure';
import {
  LEVELS_PER_WORLD,
  OBJECTIVE_TYPES,
  getTimerDuration,
} from './constants';
import { hasPathOfLength } from './gridValidator';
import { getArchetypeForLevel, getArchetypeConfig } from './levelArchetypes';
import { WORLD_CONFIGS } from './worldConfig';

/**
 * Generate objectives for a level.
 *
 * Boss levels (level 7) get battle-focused objectives:
 *   - defeatBoss (primary): Reduce boss HP to 0
 *   - mechanicTrigger (secondary): Trigger boss twist mechanic N times
 *   - surviveBattle (secondary): Finish with X% health remaining
 *
 * Regular levels get archetype-driven primary + archetype-aware secondary +
 * world mechanic trigger (or fallback secondary for worlds without a mechanic).
 */
export function generateObjectives(
  world: number,
  level: number,
  grid?: string[][],
  archetype?: LevelArchetype
): LevelObjective[] {
  const objectives: LevelObjective[] = [];
  const isBossLevel = level === LEVELS_PER_WORLD; // Level 7 is boss
  const effectiveArchetype = archetype ?? getArchetypeForLevel(world, level);
  const archetypeConfig = getArchetypeConfig(effectiveArchetype);

  // =============================================
  // BOSS LEVELS: Battle-focused objectives
  // =============================================
  if (isBossLevel) {
    objectives.push({
      type: OBJECTIVE_TYPES.DEFEAT_BOSS as ObjectiveType,
      target: 100,
      isPrimary: true,
    });

    const mechanicTarget = Math.min(3 + Math.floor(world / 3), 8);
    objectives.push({
      type: OBJECTIVE_TYPES.MECHANIC_TRIGGER as ObjectiveType,
      target: mechanicTarget,
      isPrimary: false,
    });

    objectives.push({
      type: OBJECTIVE_TYPES.SURVIVE_BATTLE as ObjectiveType,
      target: 50,
      isPrimary: false,
    });

    return objectives;
  }

  // =============================================
  // ARCHETYPE-DRIVEN OBJECTIVES
  // =============================================
  const globalLevel = (world - 1) * LEVELS_PER_WORLD + level;
  const timerSeconds = Math.max(80, Math.round(getTimerDuration(world) * archetypeConfig.timerMultiplier));
  const LONG_WORD_LENGTH = 5;

  // --- PRIMARY OBJECTIVE (driven by archetype) ---
  switch (archetypeConfig.primaryObjective) {
    case 'clearIce': {
      const baseIce = world <= 2 ? 3 : world <= 5 ? 5 : 7;
      const target = Math.min(baseIce + Math.floor(level / 2), 15);
      objectives.push({
        type: OBJECTIVE_TYPES.CLEAR_ICE as ObjectiveType,
        target,
        isPrimary: true,
      });
      break;
    }

    case 'scoreTarget': {
      const AVERAGE_WORD_SCORE = 65;
      const estimatedWordsInTime = timerSeconds / 5;
      const difficultyFactor = 0.4 + (world - 1) * (0.7 / 9);
      const levelBonus = 1 + (globalLevel - 1) * 0.015;
      // Gold Rush gets a score boost since the board is loaded with multipliers
      const archetypeBoost = effectiveArchetype === 'forge' ? 1.4 : 1;
      const worldCap = Math.round(1500 + (world - 1) * (1500 / 9));
      const target = Math.min(
        Math.round(estimatedWordsInTime * AVERAGE_WORD_SCORE * difficultyFactor * levelBonus * archetypeBoost),
        worldCap
      );
      objectives.push({
        type: OBJECTIVE_TYPES.SCORE_TARGET as ObjectiveType,
        target,
        isPrimary: true,
      });
      break;
    }

    case 'longWords': {
      const gridSupportsLongWords = !grid || hasPathOfLength(grid, LONG_WORD_LENGTH);
      if (gridSupportsLongWords) {
        const base = world <= 3 ? 2 : world <= 6 ? 3 : 4;
        const target = Math.min(base + Math.floor(level / 3), 7);
        objectives.push({
          type: OBJECTIVE_TYPES.LONG_WORDS as ObjectiveType,
          target,
          isPrimary: true,
        });
      } else {
        // Fallback if grid can't support long paths
        const target = Math.min(5 + Math.floor(globalLevel / 5), 15);
        objectives.push({
          type: OBJECTIVE_TYPES.WORD_COUNT as ObjectiveType,
          target,
          isPrimary: true,
        });
      }
      break;
    }

    case 'timeBonus': {
      // Target is a % of the (already reduced) timer
      const target = Math.max(Math.round(timerSeconds * 0.25), 10);
      objectives.push({
        type: OBJECTIVE_TYPES.TIME_BONUS as ObjectiveType,
        target,
        isPrimary: true,
      });
      break;
    }

    case 'wordCount':
    default: {
      const baseWords = world <= 1 ? 5 : world <= 2 ? 6 : world <= 3 ? 7 : 8;
      // Cascade gets a higher word count (chains help find more words)
      const archetypeBoost = effectiveArchetype === 'blast' ? 1.2 : 1;
      let target = Math.min(
        Math.round((baseWords + Math.floor(globalLevel / 5) * 2) * archetypeBoost),
        25
      );
      const maxReasonableWords = Math.floor((timerSeconds / 4) * 0.8);
      target = Math.min(target, maxReasonableWords);
      target = Math.max(4, target);
      objectives.push({
        type: OBJECTIVE_TYPES.WORD_COUNT as ObjectiveType,
        target,
        isPrimary: true,
      });
      break;
    }
  }

  // --- SECONDARY OBJECTIVES (archetype-aware) ---

  const secondaries = archetypeConfig.secondaryObjectives;
  const primaryType = objectives[0].type;

  for (const secType of secondaries) {
    if (secType === primaryType) continue;
    if (secType === 'mechanicTrigger' || secType === 'surviveBattle') continue;
    if (secType === 'longWords' && grid && !hasPathOfLength(grid, LONG_WORD_LENGTH)) continue;

    const target = generateSecondaryTarget(secType, world, level, timerSeconds, globalLevel);
    if (target > 0) {
      objectives.push({
        type: secType as ObjectiveType,
        target,
        isPrimary: false,
      });
      break; // Only add first valid secondary from archetype
    }
  }

  // Secondary 2: World mechanic trigger (world 2+), or fallback secondary for W1
  const worldConfig = WORLD_CONFIGS[world - 1];
  if (worldConfig?.mechanic) {
    const mechanicTarget = Math.min(1 + Math.floor((world - 1) / 2), 4);
    objectives.push({
      type: OBJECTIVE_TYPES.MECHANIC_TRIGGER as ObjectiveType,
      target: mechanicTarget,
      isPrimary: false,
    });
  } else {
    // Worlds without a mechanic (W1) get a second archetype secondary
    // to ensure 3-star is achievable (need 2 secondaries for 3 stars)
    const usedTypes = new Set(objectives.map(o => o.type));
    const fallbackOrder: ObjectiveType[] = ['scoreTarget', 'longWords', 'wordCount', 'timeBonus'];
    for (const fbType of fallbackOrder) {
      if (usedTypes.has(fbType)) continue;
      if (fbType === 'longWords' && grid && !hasPathOfLength(grid, LONG_WORD_LENGTH)) continue;
      const target = generateSecondaryTarget(fbType, world, level, timerSeconds, globalLevel);
      if (target > 0) {
        objectives.push({ type: fbType as ObjectiveType, target, isPrimary: false });
        break;
      }
    }
  }

  return objectives;
}

/**
 * Generate a target value for a secondary objective type.
 * Shared helper to keep secondary objective scaling consistent.
 */
function generateSecondaryTarget(
  type: ObjectiveType,
  world: number,
  level: number,
  timerSeconds: number,
  _globalLevel: number
): number {
  const worldEase = world <= 2 ? 0.5 : world <= 4 ? 0.6 : 0.7;

  switch (type) {
    case 'scoreTarget': {
      const estimatedWords = timerSeconds / 5;
      const factor = 0.5 + (world - 1) * (0.6 / 9);
      return Math.max(Math.round(estimatedWords * 65 * factor * worldEase), 200);
    }
    case 'wordCount': {
      const estimatedWords = timerSeconds / 5;
      return Math.max(Math.round(estimatedWords * worldEase), 3);
    }
    case 'longWords': {
      return Math.min(1 + Math.floor((level - 1) / 2), 5);
    }
    case 'clearIce': {
      return world >= 2 ? Math.min(2 + Math.floor(level / 3), 8) : 0;
    }
    case 'timeBonus': {
      return Math.max(Math.round(timerSeconds * 0.1), 10);
    }
    case 'collectGems': {
      return world >= 2 ? Math.min(2 + Math.floor((world - 2) / 3), 3) : 0;
    }
    default:
      return 0;
  }
}
