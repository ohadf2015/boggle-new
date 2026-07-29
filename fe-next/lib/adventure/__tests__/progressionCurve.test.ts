/**
 * Progression Curve Tests
 *
 * Validates the adventure mode progression curve holistically:
 * - Star economy (all levels can earn 3 stars)
 * - Gold economy (players can afford upgrades at expected pace)
 * - Timer floors (no archetype creates unplayable timers)
 * - XP pacing (player level tracks world progression)
 */

import { generateObjectives, getLevelConfig } from '../levelConfig';
import { LEVELS_PER_WORLD, WORLDS_COUNT, getDifficultyForWorld } from '../constants';
import { getArchetypeForLevel } from '../levelArchetypes';
import { generateLootChest } from '../lootConfig';
import { calculateAdventureXp, getLevelFromXp, type Difficulty } from '@/shared/utils/adventureXpUtils';

// ==============================================
// STAR ECONOMY
// ==============================================

describe('Star economy', () => {
  it('every non-boss level should have at least 3 objectives (enabling 3 stars)', () => {
    for (let world = 1; world <= WORLDS_COUNT; world++) {
      for (let level = 1; level < LEVELS_PER_WORLD; level++) {
        const objectives = generateObjectives(world, level);
        const secondaryCount = objectives.filter(o => !o.isPrimary).length;

        // 1 star for all primaries + 1 per secondary, so need >= 2 secondaries for 3 stars
        expect(secondaryCount).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('boss levels should have exactly 3 objectives', () => {
    for (let world = 1; world <= WORLDS_COUNT; world++) {
      const objectives = generateObjectives(world, LEVELS_PER_WORLD);
      expect(objectives).toHaveLength(3);
      expect(objectives.filter(o => o.isPrimary)).toHaveLength(1);
      expect(objectives.filter(o => !o.isPrimary)).toHaveLength(2);
    }
  });

  it('W1 levels should be able to earn 3 stars (not capped at 2)', () => {
    for (let level = 1; level < LEVELS_PER_WORLD; level++) {
      const objectives = generateObjectives(1, level);
      // With 1 primary and 2+ secondaries, max stars = min(1 + secondaryCount, 3) = 3
      const secondaryCount = objectives.filter(o => !o.isPrimary).length;
      expect(secondaryCount).toBeGreaterThanOrEqual(2);
    }
  });
});

// ==============================================
// GOLD ECONOMY
// ==============================================

describe('Gold economy', () => {
  it('cumulative W1 gold (at 1 star) should afford the cheapest upgrade (40g) by level 5', () => {
    let totalGold = 0;
    for (let level = 1; level <= 5; level++) {
      const chest = generateLootChest(1, level, 1, 0, 1);
      totalGold += chest.drops.reduce((sum, d) => sum + (d.type === 'gold' || d.type === 'bonusGold' ? d.amount : 0), 0);
    }
    expect(totalGold).toBeGreaterThanOrEqual(40);
  });

  it('cumulative W1 gold (at 2 stars) should afford two upgrades by world end', () => {
    let totalGold = 0;
    for (let level = 1; level <= LEVELS_PER_WORLD; level++) {
      const chest = generateLootChest(1, level, 2, 0, 1);
      totalGold += chest.drops.reduce((sum, d) => sum + (d.type === 'gold' || d.type === 'bonusGold' ? d.amount : 0), 0);
    }
    // Two cheapest upgrades: 40 + 50 = 90
    expect(totalGold).toBeGreaterThanOrEqual(90);
  });

  it('base gold should increase with world from W2 onwards (W1-W2 are early-world boosted per F4)', () => {
    // F4 audit (2026-05-01): W1-W2 baseGold ×1.5 boost intentionally creates
    // early-world plenty so casual players can afford a T1 upgrade in 1-2 levels.
    // This deliberately flattens W1→W2→W3 (may even invert at W2→W3) — the
    // tradeoff the audit accepted. Strict monotonicity resumes from W3 onward.
    const baseGoldByWorld: number[] = [];
    for (let world = 1; world <= WORLDS_COUNT; world++) {
      const chest = generateLootChest(world, 1, 2, 0, 1);
      const baseGold = chest.drops.find(d => d.type === 'gold')?.amount ?? 0;
      baseGoldByWorld.push(baseGold);
    }
    // Monotonic from W3 onward (index 2 = world 3).
    for (let i = 3; i < baseGoldByWorld.length; i++) {
      expect(baseGoldByWorld[i]).toBeGreaterThan(baseGoldByWorld[i - 1]);
    }
    // W1 should still be lower than the late game so progression isn't trivialized.
    expect(baseGoldByWorld[baseGoldByWorld.length - 1]).toBeGreaterThan(baseGoldByWorld[0]);
  });
});

// ==============================================
// TIMER FLOORS
// ==============================================

describe('Timer floors', () => {
  it('timer-based levels should have an effective timer >= 80 seconds', () => {
    // blast and hunt archetypes use timerSeconds=0 (non-timer modes)
    for (let world = 1; world <= WORLDS_COUNT; world++) {
      for (let level = 1; level <= LEVELS_PER_WORLD; level++) {
        const config = getLevelConfig(world, level);
        if (config.timerSeconds > 0) {
          expect(config.timerSeconds).toBeGreaterThanOrEqual(80);
        }
      }
    }
  });

  it('timer-based archetypes should have timerSeconds >= 80s via getLevelConfig floor', () => {
    // Timer-based archetypes (classic, wheel, forge) apply a multiplier but floor at 80s.
    // blast and hunt set timerSeconds = 0 (non-timer modes).
    for (let world = 1; world <= WORLDS_COUNT; world++) {
      for (let level = 1; level <= LEVELS_PER_WORLD; level++) {
        const archetype = getArchetypeForLevel(world, level);
        if (archetype !== 'blast' && archetype !== 'hunt' && archetype !== 'boss') {
          const config = getLevelConfig(world, level);
          expect(config.timerSeconds).toBeGreaterThanOrEqual(80);
        }
      }
    }
  });

  it('blast and hunt archetype levels should have timerSeconds = 0 (non-timer mode)', () => {
    for (let world = 1; world <= WORLDS_COUNT; world++) {
      for (let level = 1; level <= LEVELS_PER_WORLD; level++) {
        const archetype = getArchetypeForLevel(world, level);
        if (archetype === 'blast' || archetype === 'hunt') {
          const config = getLevelConfig(world, level);
          expect(config.timerSeconds).toBe(0);
        }
      }
    }
  });
});

// ==============================================
// XP PACING
// ==============================================

describe('XP pacing', () => {
  it('completing a world at 2 stars avg should bring player level close to world×5', () => {
    let totalXp = 0;
    for (let world = 1; world <= WORLDS_COUNT; world++) {
      const difficulty = getDifficultyForWorld(world).toLowerCase() as Difficulty;
      for (let level = 1; level <= LEVELS_PER_WORLD; level++) {
        // 2-star average, combo 1, no special bonuses
        const xp = calculateAdventureXp(difficulty, 1, { worldId: world });
        // Plus star XP from loot
        const chest = generateLootChest(world, level, 2, 0, 1);
        const lootXp = chest.drops.reduce((sum, d) => sum + (d.type === 'xp' ? d.amount : 0), 0);
        totalXp += xp + lootXp;
      }

      const expectedLevel = world * 5;
      const actualLevel = getLevelFromXp(totalXp);
      // Allow ±5 level tolerance (exponential XP curve can't perfectly match linear targets)
      expect(actualLevel).toBeGreaterThanOrEqual(expectedLevel - 5);
      expect(actualLevel).toBeLessThanOrEqual(expectedLevel + 5);
    }
  });

  it('XP curve should not have dead zones (each world adds meaningful level progress)', () => {
    let totalXp = 0;
    let previousLevel = 1;

    for (let world = 1; world <= WORLDS_COUNT; world++) {
      const difficulty = getDifficultyForWorld(world).toLowerCase() as Difficulty;
      for (let level = 1; level <= LEVELS_PER_WORLD; level++) {
        const xp = calculateAdventureXp(difficulty, 1, { worldId: world });
        const chest = generateLootChest(world, level, 2, 0, 1);
        const lootXp = chest.drops.reduce((sum, d) => sum + (d.type === 'xp' ? d.amount : 0), 0);
        totalXp += xp + lootXp;
      }

      const currentLevel = getLevelFromXp(totalXp);
      // Each world should advance at least 2 levels
      expect(currentLevel - previousLevel).toBeGreaterThanOrEqual(2);
      previousLevel = currentLevel;
    }
  });
});

// ==============================================
// ALL LEVELS VALID
// ==============================================

describe('All 70 levels valid', () => {
  it('every level config should pass validation', () => {
    for (let world = 1; world <= WORLDS_COUNT; world++) {
      for (let level = 1; level <= LEVELS_PER_WORLD; level++) {
        const config = getLevelConfig(world, level);
        expect(config.world).toBe(world);
        expect(config.level).toBe(level);
        // timerSeconds is 0 for non-timer archetypes (blast = move-limited, hunt = life-based)
        expect(config.timerSeconds).toBeGreaterThanOrEqual(0);
        expect(config.objectives.length).toBeGreaterThanOrEqual(1);
        expect(config.gridSize).toBeGreaterThanOrEqual(4);
        expect(config.gridSize).toBeLessThanOrEqual(7);
      }
    }
  });

  it('objective targets should be positive and reasonable', () => {
    for (let world = 1; world <= WORLDS_COUNT; world++) {
      for (let level = 1; level <= LEVELS_PER_WORLD; level++) {
        const objectives = generateObjectives(world, level);
        for (const obj of objectives) {
          expect(obj.target).toBeGreaterThan(0);
          // Score targets can be high (hundreds), but non-score objectives should be reasonable
          if (obj.type !== 'scoreTarget' && obj.type !== 'defeatBoss' && obj.type !== 'surviveBattle') {
            expect(obj.target).toBeLessThanOrEqual(35);
          }
        }
      }
    }
  });
});
