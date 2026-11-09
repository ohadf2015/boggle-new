import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { LetterGrid } from '@/types';

vi.mock('@/hooks/useDictionaryCache', () => ({
  prewarmDictionary: vi.fn(async () => {}),
  hasWordInMemoryCache: vi.fn(() => false),
}));

import { useStarterGuide, STUCK_AFTER_MS } from '../useStarterGuide';
import type { FeedbackType } from '../../types';

const grid: LetterGrid = [
  ['T', 'R', 'X', 'Q'],
  ['Z', 'E', 'E', 'Q'],
  ['Q', 'Q', 'Q', 'Q'],
  ['Q', 'Q', 'Q', 'Q'],
];

const t = (key: string, params?: Record<string, string | number> | string) =>
  typeof params === 'object' ? `${key}:${params.word}` : key;

type Props = Parameters<typeof useStarterGuide>[0];
const base: Props = {
  enabled: true,
  grid,
  language: 'en',
  targetLength: 5,
  foundWords: [],
  feedbackSeq: 0,
  feedbackType: null,
  t,
};

describe('useStarterGuide', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('stays quiet at the start, so the player gets to try first', () => {
    const { result } = renderHook(() => useStarterGuide(base));
    expect(result.current).toBeNull();
  });

  it('Given no word found, When the player has been stuck for a while, Then it lights a real word', () => {
    const { result } = renderHook(() => useStarterGuide(base));
    act(() => { vi.advanceTimersByTime(STUCK_AFTER_MS); });
    expect(result.current?.prompt).toBe('wordHunt.survival.tryWord:TREE');
    expect(result.current?.path).toHaveLength(4);
  });

  it('Given two rejected swipes, Then it helps right away', () => {
    const { result, rerender } = renderHook((p: Props) => useStarterGuide(p), { initialProps: base });
    rerender({ ...base, feedbackSeq: 1, feedbackType: 'not-in-dictionary' as FeedbackType });
    expect(result.current).toBeNull();
    rerender({ ...base, feedbackSeq: 2, feedbackType: 'not-on-board' as FeedbackType });
    expect(result.current?.prompt).toBe('wordHunt.survival.tryWord:TREE');
  });

  it('Given the first word is found, Then the guide goes away for good', () => {
    const { result, rerender } = renderHook((p: Props) => useStarterGuide(p), { initialProps: base });
    act(() => { vi.advanceTimersByTime(STUCK_AFTER_MS); });
    expect(result.current).not.toBeNull();
    rerender({ ...base, foundWords: ['TREE'] });
    expect(result.current).toBeNull();
  });

  it('does nothing for experienced players', () => {
    const { result } = renderHook(() => useStarterGuide({ ...base, enabled: false }));
    act(() => { vi.advanceTimersByTime(STUCK_AFTER_MS * 2); });
    expect(result.current).toBeNull();
  });
});
