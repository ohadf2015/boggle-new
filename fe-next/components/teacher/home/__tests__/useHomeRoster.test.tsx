import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const metrics = vi.hoisted(() => ({ value: { students: [] as unknown[], isLoading: true, error: null as Error | null } }));
vi.mock('@/hooks/useStudentProgressMetrics', () => ({ useStudentProgressMetrics: () => ({ ...metrics.value, refresh: vi.fn() }) }));

import { useHomeRoster } from '../HomeRosterLive';

const NOW = Date.parse('2026-11-04T12:00:00Z');
const student = (id: string) => ({
  studentId: id, displayName: id, totalXp: 10, wordsMastered: 1, wordsAttempted: 2, overallAccuracy: 50, currentStreak: 0, lastPracticeDate: null,
});

describe('useHomeRoster', () => {
  it('Given the read is in flight, Then rows are null', () => {
    metrics.value = { students: [], isLoading: true, error: null };
    const { result } = renderHook(() => useHomeRoster('a', NOW));
    expect(result.current).toEqual({ rows: null, failed: false });
  });

  it('Given the read finished for this class, Then rows come back', () => {
    metrics.value = { students: [], isLoading: true, error: null };
    const { result, rerender } = renderHook(() => useHomeRoster('a', NOW));
    metrics.value = { students: [student('s1')], isLoading: false, error: null };
    rerender();
    expect(result.current.rows?.map((r) => r.id)).toEqual(['s1']);
  });

  it('When the class switches, Then the previous class rows are never shown before the new read starts', () => {
    metrics.value = { students: [], isLoading: true, error: null };
    let id = 'a';
    const { result, rerender } = renderHook(() => useHomeRoster(id, NOW));
    metrics.value = { students: [student('s1')], isLoading: false, error: null };
    rerender();
    id = 'b';
    rerender();
    expect(result.current.rows).toBeNull();
    metrics.value = { students: [], isLoading: true, error: null };
    rerender();
    metrics.value = { students: [student('s2')], isLoading: false, error: null };
    rerender();
    expect(result.current.rows?.map((r) => r.id)).toEqual(['s2']);
  });

  it('Given the read failed, Then failed is true and rows null', () => {
    metrics.value = { students: [], isLoading: true, error: null };
    const { result, rerender } = renderHook(() => useHomeRoster('a', NOW));
    metrics.value = { students: [], isLoading: false, error: new Error('x') };
    rerender();
    expect(result.current).toEqual({ rows: null, failed: true });
  });
});
