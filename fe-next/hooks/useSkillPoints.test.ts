/**
 * useSkillPoints Tests
 *
 * Tests for skill point awarding on level up.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSkillPoints } from './useSkillPoints';
import { useSkillTreeStore } from './useSkillTreeStore';

describe('useSkillPoints', () => {
  beforeEach(() => {
    // Reset store between tests
    const { result } = renderHook(() => useSkillTreeStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('initial state', () => {
    it('tracks initial level', () => {
      const { result } = renderHook(() => useSkillPoints({ currentLevel: 5 }));
      expect(result.current.trackedLevel).toBe(5);
    });

    it('does not award points on initial render', () => {
      const store = useSkillTreeStore.getState();
      const initialPoints = store.availablePoints;

      renderHook(() => useSkillPoints({ currentLevel: 1 }));

      expect(useSkillTreeStore.getState().availablePoints).toBe(initialPoints);
    });
  });

  describe('level up detection', () => {
    it('awards 1 point when level increases by 1', () => {
      const { rerender } = renderHook(
        ({ level }) => useSkillPoints({ currentLevel: level }),
        { initialProps: { level: 1 } }
      );

      rerender({ level: 2 });

      expect(useSkillTreeStore.getState().availablePoints).toBe(1);
    });

    it('awards multiple points for multi-level jump', () => {
      const { rerender } = renderHook(
        ({ level }) => useSkillPoints({ currentLevel: level }),
        { initialProps: { level: 1 } }
      );

      rerender({ level: 4 }); // Jump 3 levels

      expect(useSkillTreeStore.getState().availablePoints).toBe(3);
    });

    it('does not award points when level stays same', () => {
      const { rerender } = renderHook(
        ({ level }) => useSkillPoints({ currentLevel: level }),
        { initialProps: { level: 5 } }
      );

      rerender({ level: 5 });

      expect(useSkillTreeStore.getState().availablePoints).toBe(0);
    });

    it('does not award points when level decreases', () => {
      const { rerender } = renderHook(
        ({ level }) => useSkillPoints({ currentLevel: level }),
        { initialProps: { level: 5 } }
      );

      rerender({ level: 3 });

      expect(useSkillTreeStore.getState().availablePoints).toBe(0);
    });

    it('accumulates points across multiple level ups', () => {
      const { rerender } = renderHook(
        ({ level }) => useSkillPoints({ currentLevel: level }),
        { initialProps: { level: 1 } }
      );

      rerender({ level: 2 });
      rerender({ level: 3 });
      rerender({ level: 4 });

      expect(useSkillTreeStore.getState().availablePoints).toBe(3);
    });
  });

  describe('callback integration', () => {
    it('calls onLevelUp callback when level increases', () => {
      const onLevelUp = vi.fn();

      const { rerender } = renderHook(
        ({ level }) => useSkillPoints({ currentLevel: level, onLevelUp }),
        { initialProps: { level: 1 } }
      );

      rerender({ level: 2 });

      expect(onLevelUp).toHaveBeenCalledWith({
        previousLevel: 1,
        newLevel: 2,
        pointsAwarded: 1,
      });
    });

    it('callback receives correct multi-level data', () => {
      const onLevelUp = vi.fn();

      const { rerender } = renderHook(
        ({ level }) => useSkillPoints({ currentLevel: level, onLevelUp }),
        { initialProps: { level: 5 } }
      );

      rerender({ level: 8 });

      expect(onLevelUp).toHaveBeenCalledWith({
        previousLevel: 5,
        newLevel: 8,
        pointsAwarded: 3,
      });
    });

    it('does not call callback when level stays same', () => {
      const onLevelUp = vi.fn();

      const { rerender } = renderHook(
        ({ level }) => useSkillPoints({ currentLevel: level, onLevelUp }),
        { initialProps: { level: 5 } }
      );

      rerender({ level: 5 });

      expect(onLevelUp).not.toHaveBeenCalled();
    });
  });

  describe('return values', () => {
    it('returns current tracked level', () => {
      const { result, rerender } = renderHook(
        ({ level }) => useSkillPoints({ currentLevel: level }),
        { initialProps: { level: 1 } }
      );

      expect(result.current.trackedLevel).toBe(1);

      rerender({ level: 5 });
      expect(result.current.trackedLevel).toBe(5);
    });

    it('returns available points from store', () => {
      const { result, rerender } = renderHook(
        ({ level }) => useSkillPoints({ currentLevel: level }),
        { initialProps: { level: 1 } }
      );

      rerender({ level: 3 });
      expect(result.current.availablePoints).toBe(2);
    });

    it('returns total points earned from store', () => {
      const { result, rerender } = renderHook(
        ({ level }) => useSkillPoints({ currentLevel: level }),
        { initialProps: { level: 1 } }
      );

      rerender({ level: 4 });
      expect(result.current.totalPointsEarned).toBe(3);
    });
  });
});
