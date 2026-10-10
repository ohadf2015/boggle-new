import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLesson, SUCCESS_MS, COMPLETE_MS, FINALE_DELAY_MS, type UseLessonArgs } from './useLesson';
import { CLASSIC_LESSON, type LessonWord } from '@/lib/tutorial/lesson/lessonEngine';
import { lessonStorageKey } from '@/lib/tutorial/lesson/lessonStorage';

const valid = (word: string): LessonWord => ({ word, isValid: true });
const KEY = lessonStorageKey('classic');

function setup(initial: Partial<UseLessonArgs> = {}) {
  const base: UseLessonArgs = { definition: CLASSIC_LESSON, enabled: true, words: [], feedback: null, ...initial };
  return renderHook((props: UseLessonArgs) => useLesson(props), { initialProps: base });
}

describe('useLesson', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('runs for a player who has never finished or skipped it', () => {
    const { result } = setup();
    expect(result.current.active).toBe(true);
    expect(result.current.completedCount).toBe(0);
    expect(result.current.step?.kind).toBe('trace');
  });

  it('stays off when the mode disables it or the player already did it', () => {
    expect(setup({ enabled: false }).result.current.active).toBe(false);
    window.localStorage.setItem(KEY, 'done');
    expect(setup().result.current.active).toBe(false);
  });

  it('celebrates each completed step with a success event that clears itself', () => {
    const { result, rerender } = setup();
    rerender({ definition: CLASSIC_LESSON, enabled: true, words: [valid('cat')], feedback: null });
    expect(result.current.completedCount).toBe(1);
    expect(result.current.event).toMatchObject({ kind: 'success', word: 'cat', streak: 1 });
    act(() => void vi.advanceTimersByTime(SUCCESS_MS + 10));
    expect(result.current.event).toBeNull();
  });

  it('counts a streak and resets it on a miss', () => {
    const { result, rerender } = setup();
    const p = { definition: CLASSIC_LESSON, enabled: true };
    rerender({ ...p, words: [valid('cat')], feedback: null });
    rerender({ ...p, words: [valid('cat'), valid('dog')], feedback: null });
    expect(result.current.event).toMatchObject({ kind: 'success', streak: 2 });
    rerender({ ...p, words: [valid('cat'), valid('dog')], feedback: { id: 'r1', type: 'rejected', message: 'Not a word' } });
    expect(result.current.event).toMatchObject({ kind: 'oops', message: 'Not a word' });
    rerender({ ...p, words: [valid('cat'), valid('dog'), valid('cats')], feedback: null });
    expect(result.current.event).toMatchObject({ kind: 'success', streak: 1 });
    expect(result.current.bestStreak).toBe(2);
  });

  it('persists "done" the moment the last step lands, lets that win land, then shows the finale until it times out', () => {
    const { result, rerender } = setup();
    rerender({
      definition: CLASSIC_LESSON,
      enabled: true,
      words: [valid('cat'), valid('dog'), valid('cats'), valid('plane')],
      feedback: null,
    });
    expect(window.localStorage.getItem(KEY)).toBe('done');
    expect(result.current.complete).toBe(false);
    expect(result.current.active).toBe(true);
    expect(result.current.event).toMatchObject({ kind: 'success', stepIndex: 3 });
    act(() => void vi.advanceTimersByTime(FINALE_DELAY_MS + 10));
    expect(result.current.complete).toBe(true);
    expect(result.current.holdClock).toBe(true);
    act(() => void vi.advanceTimersByTime(COMPLETE_MS + 10));
    expect(result.current.complete).toBe(false);
    expect(result.current.active).toBe(false);
  });

  it('can be skipped, and the skip is remembered', () => {
    const { result } = setup();
    act(() => result.current.skip());
    expect(result.current.active).toBe(false);
    expect(window.localStorage.getItem(KEY)).toBe('skipped');
  });
});
