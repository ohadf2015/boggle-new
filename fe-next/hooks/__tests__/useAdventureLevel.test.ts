/**
 * useAdventureLevel Tests
 *
 * Tests for the adventure level configuration hook
 * Uses real adventure lib functions (pure functions, no side effects)
 */

import { renderHook } from '@testing-library/react';
import { useAdventureLevel } from '../useAdventureLevel';

describe('useAdventureLevel', () => {
  describe('Level Configuration', () => {
    it('should return level config for valid world and level', () => {
      // GIVEN
      const world = 1;
      const level = 1;

      // WHEN
      const { result } = renderHook(() => useAdventureLevel(world, level));

      // THEN
      expect(result.current.levelConfig).toBeDefined();
      expect(result.current.levelConfig?.world).toBe(1);
      expect(result.current.levelConfig?.level).toBe(1);
    });

    it('should return correct grid size for world', () => {
      // GIVEN - World 1 (tutorial) should have 4x4 grid
      const { result: result1 } = renderHook(() => useAdventureLevel(1, 1));
      expect(result1.current.levelConfig?.gridSize).toBe(4);

      // GIVEN - World 5 should have 5x5 grid
      const { result: result5 } = renderHook(() => useAdventureLevel(5, 1));
      expect(result5.current.levelConfig?.gridSize).toBe(5);

      // GIVEN - World 9 should have 7x7 grid
      const { result: result9 } = renderHook(() => useAdventureLevel(9, 1));
      expect(result9.current.levelConfig?.gridSize).toBe(7);
    });

    it('should return objectives for level', () => {
      // GIVEN
      const world = 3;
      const level = 5;

      // WHEN
      const { result } = renderHook(() => useAdventureLevel(world, level));

      // THEN
      expect(result.current.levelConfig?.objectives).toBeDefined();
      expect(result.current.levelConfig?.objectives.length).toBeGreaterThan(0);
    });

    it('should return valid config for world 0 (endless sentinel)', () => {
      const { result: resultWorld0 } = renderHook(() => useAdventureLevel(0, 1));
      expect(resultWorld0.current.levelConfig).toBeDefined();
      expect(resultWorld0.current.error).toBeFalsy();
    });

    it('should return null for invalid world/level', () => {
      // GIVEN - World 11 is invalid (must be 1-10)
      const { result: resultWorld11 } = renderHook(() => useAdventureLevel(11, 1));

      // THEN
      expect(resultWorld11.current.levelConfig).toBeNull();
      expect(resultWorld11.current.error).toBeTruthy();

      // GIVEN - Level 0 is invalid (must be 1-7)
      const { result: resultLevel0 } = renderHook(() => useAdventureLevel(1, 0));

      // THEN
      expect(resultLevel0.current.levelConfig).toBeNull();
      expect(resultLevel0.current.error).toBeTruthy();

      // GIVEN - Level 8 is invalid (must be 1-7)
      const { result: resultLevel8 } = renderHook(() => useAdventureLevel(1, 8));

      // THEN
      expect(resultLevel8.current.levelConfig).toBeNull();
      expect(resultLevel8.current.error).toBeTruthy();
    });
  });

  describe('World Configuration', () => {
    it('should return world config', () => {
      // GIVEN
      const world = 2;
      const level = 1;

      // WHEN
      const { result } = renderHook(() => useAdventureLevel(world, level));

      // THEN
      expect(result.current.worldConfig).toBeDefined();
      expect(result.current.worldConfig?.id).toBe(2);
    });

    it('should include world mechanic for non-tutorial worlds', () => {
      // GIVEN - World 2 has synonym mechanic
      const { result } = renderHook(() => useAdventureLevel(2, 1));

      // THEN
      expect(result.current.levelConfig?.worldMechanic).toBeDefined();
    });

    it('should not include mechanic for tutorial world', () => {
      // GIVEN - World 1 is tutorial
      const { result } = renderHook(() => useAdventureLevel(1, 1));

      // THEN - World 1 has no special mechanic
      expect(result.current.levelConfig?.worldMechanic).toBeUndefined();
    });
  });

  describe('Level Metadata', () => {
    it('should provide isBossLevel for level 7 (boss level in 2-2-3 structure)', () => {
      // GIVEN - level 7 is boss level (final level of boss chapter)
      const { result: boss } = renderHook(() => useAdventureLevel(1, 7));
      const { result: normal } = renderHook(() => useAdventureLevel(1, 3));

      // THEN
      expect(boss.current.isBossLevel).toBe(true);
      expect(normal.current.isBossLevel).toBe(false);
    });

    it('should provide difficulty string', () => {
      // GIVEN - based on actual difficulty progression in levelConfig
      const { result: early } = renderHook(() => useAdventureLevel(1, 1));
      const { result: mid } = renderHook(() => useAdventureLevel(5, 1));
      const { result: late } = renderHook(() => useAdventureLevel(10, 1));

      // THEN - each should have a valid difficulty
      expect(['EASY', 'MEDIUM', 'HARD']).toContain(early.current.levelConfig?.difficulty);
      expect(['EASY', 'MEDIUM', 'HARD']).toContain(mid.current.levelConfig?.difficulty);
      expect(['EASY', 'MEDIUM', 'HARD']).toContain(late.current.levelConfig?.difficulty);
    });

    it('should provide globalLevelNumber', () => {
      // GIVEN - 7 levels per world
      const { result: w1l1 } = renderHook(() => useAdventureLevel(1, 1));
      const { result: w2l5 } = renderHook(() => useAdventureLevel(2, 5));
      const { result: w10l7 } = renderHook(() => useAdventureLevel(10, 7));

      // THEN
      expect(w1l1.current.globalLevelNumber).toBe(1);
      expect(w2l5.current.globalLevelNumber).toBe(12); // (2-1)*7 + 5
      expect(w10l7.current.globalLevelNumber).toBe(70); // (10-1)*7 + 7
    });
  });

  describe('Update on Props Change', () => {
    it('should update config when world changes', () => {
      // GIVEN
      const { result, rerender } = renderHook(
        ({ world, level }) => useAdventureLevel(world, level),
        { initialProps: { world: 1, level: 1 } }
      );

      expect(result.current.levelConfig?.world).toBe(1);

      // WHEN
      rerender({ world: 3, level: 1 });

      // THEN
      expect(result.current.levelConfig?.world).toBe(3);
    });

    it('should update config when level changes', () => {
      // GIVEN
      const { result, rerender } = renderHook(
        ({ world, level }) => useAdventureLevel(world, level),
        { initialProps: { world: 1, level: 1 } }
      );

      expect(result.current.levelConfig?.level).toBe(1);

      // WHEN
      rerender({ world: 1, level: 5 });

      // THEN
      expect(result.current.levelConfig?.level).toBe(5);
    });
  });
});
