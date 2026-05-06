import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useComboStreakMilestone } from '../useComboStreakMilestone';

describe('useComboStreakMilestone', () => {
  it('returns null until a milestone tier is crossed', () => {
    const { result } = renderHook(({ level }) => useComboStreakMilestone(level), {
      initialProps: { level: 1 },
    });
    expect(result.current).toBeNull();
  });

  it('emits tier 1 when level rises from below 5 to 5', () => {
    const { result, rerender } = renderHook(({ level }) => useComboStreakMilestone(level), {
      initialProps: { level: 4 },
    });
    rerender({ level: 5 });
    expect(result.current?.tier).toBe(1);
  });

  it('emits tier 2 when level reaches 10', () => {
    const { result, rerender } = renderHook(({ level }) => useComboStreakMilestone(level), {
      initialProps: { level: 9 },
    });
    rerender({ level: 10 });
    expect(result.current?.tier).toBe(2);
  });

  it('does not re-emit when level holds at the milestone', () => {
    const { result, rerender } = renderHook(({ level }) => useComboStreakMilestone(level), {
      initialProps: { level: 4 },
    });
    rerender({ level: 5 });
    const firstId = result.current?.id;
    rerender({ level: 5 });
    expect(result.current?.id).toBe(firstId);
  });

  it('resets when level drops back to 0 (combo broken)', () => {
    const { result, rerender } = renderHook(({ level }) => useComboStreakMilestone(level), {
      initialProps: { level: 5 },
    });
    const firstId = result.current?.id;
    rerender({ level: 0 });
    rerender({ level: 5 });
    expect(result.current?.id).not.toBe(firstId);
  });

  it('does not emit for non-milestone levels (3, 7)', () => {
    const { result, rerender } = renderHook(({ level }) => useComboStreakMilestone(level), {
      initialProps: { level: 2 },
    });
    rerender({ level: 3 });
    expect(result.current).toBeNull();
    rerender({ level: 7 });
    expect(result.current).toBeNull();
  });
});
