/**
 * Tests for the world/level advance logic in adventure complete route.
 * Verifies that replaying earlier world levels doesn't corrupt current_level.
 */
import { describe, it, expect } from 'vitest';

/**
 * Pure function extracted from route.ts advance logic.
 * Only advances the high-water mark if nextWorld:nextLevel is truly beyond current.
 */
function computeAdvance(
  currentWorld: number, currentLevel: number,
  completedWorld: number, completedLevel: number
) {
  let nextWorld = completedWorld;
  let nextLevel = completedLevel + 1;
  if (nextLevel > 7) {
    nextWorld = completedWorld + 1;
    nextLevel = 1;
  }
  if (nextWorld > 10) {
    nextWorld = 10;
    nextLevel = 7;
  }
  const isAdvance = nextWorld > currentWorld || (nextWorld === currentWorld && nextLevel > currentLevel);
  return {
    current_world: isAdvance ? nextWorld : currentWorld,
    current_level: isAdvance ? nextLevel : currentLevel,
  };
}

describe('level advance logic', () => {
  it('advances when completing the frontier level', () => {
    const result = computeAdvance(1, 3, 1, 3);
    expect(result).toEqual({ current_world: 1, current_level: 4 });
  });

  it('advances to next world when completing last level', () => {
    const result = computeAdvance(2, 7, 2, 7);
    expect(result).toEqual({ current_world: 3, current_level: 1 });
  });

  it('does NOT corrupt unlock state when replaying an earlier world level', () => {
    // Player is at world 3, level 1. Replays world 2, level 5.
    // Bug: Math.max(1, 6) = 6 would set current_level to 6 in world 3.
    const result = computeAdvance(3, 1, 2, 5);
    expect(result).toEqual({ current_world: 3, current_level: 1 });
  });

  it('does NOT advance when replaying a level in the same world below frontier', () => {
    // Player is at world 2, level 5. Replays world 2, level 2.
    const result = computeAdvance(2, 5, 2, 2);
    expect(result).toEqual({ current_world: 2, current_level: 5 });
  });

  it('advances when replaying a level at the frontier in same world', () => {
    // Player is at world 2, level 4. Completes world 2, level 4 again.
    // nextLevel = 5 which is > 4 — should advance.
    const result = computeAdvance(2, 4, 2, 4);
    expect(result).toEqual({ current_world: 2, current_level: 5 });
  });

  it('caps at world 10 level 7', () => {
    const result = computeAdvance(10, 7, 10, 7);
    expect(result).toEqual({ current_world: 10, current_level: 7 });
  });
});
