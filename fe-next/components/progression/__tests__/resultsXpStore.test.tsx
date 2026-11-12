import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { publishResultsXp, resetResultsXp, useResultsXp } from '../resultsXpStore';

describe('resultsXpStore', () => {
  beforeEach(() => resetResultsXp());

  it('Given no XP published for a game, Then the results screen reads null', () => {
    const { result } = renderHook(() => useResultsXp('daily:word-hunt'));
    expect(result.current).toBeNull();
  });

  it('Given XP arrives after the results screen mounted, Then it updates', () => {
    const { result } = renderHook(() => useResultsXp('daily:word-hunt'));
    act(() => publishResultsXp('daily:word-hunt', { gained: 25, total: 400 }));
    expect(result.current).toEqual({ gained: 25, total: 400 });
  });

  it('keeps games apart by key', () => {
    publishResultsXp('daily:word-hunt', { gained: 25, total: 400 });
    const { result } = renderHook(() => useResultsXp('daily:word-wheel'));
    expect(result.current).toBeNull();
  });
});
