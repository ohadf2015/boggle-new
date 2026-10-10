import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLesson } from './useLesson';
import { LESSON_STORAGE_KEY } from '@/lib/tutorial/lesson/lessonStorage';
import type { LessonHint } from '@/lib/tutorial/lesson/lessonEngine';

const hint: LessonHint = { word: 'cat', path: [{ row: 0, col: 0, letter: 'c' }, { row: 0, col: 1, letter: 'a' }, { row: 0, col: 2, letter: 't' }] };

describe('useLesson', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('is active for a new player once a hint exists', () => {
    const { result } = renderHook(() => useLesson({ enabled: true, hint, words: [] }));
    expect(result.current.active).toBe(true);
    expect(result.current.completedCount).toBe(0);
  });

  it('stays off without a hint or when the mode disables it', () => {
    const noHint = renderHook(() => useLesson({ enabled: true, hint: null, words: [] }));
    expect(noHint.result.current.active).toBe(false);
    const disabled = renderHook(() => useLesson({ enabled: false, hint, words: [] }));
    expect(disabled.result.current.active).toBe(false);
  });

  it('replays played words into progress', () => {
    const { result } = renderHook(() =>
      useLesson({ enabled: true, hint, words: [{ word: 'cat', isValid: true }, { word: 'dog', isValid: false }] }),
    );
    expect(result.current.completedCount).toBe(1);
  });

  it('persists a skip and never shows again', () => {
    const { result, unmount } = renderHook(() => useLesson({ enabled: true, hint, words: [] }));
    act(() => result.current.skip());
    expect(result.current.active).toBe(false);
    expect(window.localStorage.getItem(LESSON_STORAGE_KEY)).toBe('skipped');
    unmount();
    const again = renderHook(() => useLesson({ enabled: true, hint, words: [] }));
    expect(again.result.current.active).toBe(false);
  });
});
