import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUnseenAwards } from '../useUnseenAwards';
import type { Achievement } from '@/components/education/achievements/AchievementGrid';

const a = (count: number): Achievement => ({ count, category: 'progress', icon: 'x', nameKey: 'n', descriptionKey: 'd', isSecret: false });
const KEY = 'achievement-acknowledged-stu1';

describe('useUnseenAwards', () => {
  beforeEach(() => localStorage.clear());

  it('given a newly earned award, when first seen, then it is unseen once and marked seen at show time', () => {
    const awards = { first_lesson: a(1), word_master: a(0) };
    const first = renderHook(() => useUnseenAwards('stu1', awards));
    expect([...first.result.current]).toEqual(['first_lesson']);
    expect(JSON.parse(localStorage.getItem(KEY) ?? '[]')).toContain('first_lesson:BRONZE'.toLowerCase());

    const second = renderHook(() => useUnseenAwards('stu1', awards));
    expect(second.result.current.size).toBe(0);
  });

  it('given a tier upgrade after a visit, when seen again, then the award is unseen again', () => {
    renderHook(() => useUnseenAwards('stu1', { first_lesson: a(1) }));
    const next = renderHook(() => useUnseenAwards('stu1', { first_lesson: a(3) }));
    expect([...next.result.current]).toEqual(['first_lesson']);
  });

  it('given nothing earned, when rendered, then nothing is unseen and nothing is written', () => {
    const r = renderHook(() => useUnseenAwards('stu1', { first_lesson: a(0) }));
    expect(r.result.current.size).toBe(0);
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});
