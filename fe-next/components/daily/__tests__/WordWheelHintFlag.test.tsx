import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { WHEEL_HINT_SEEN_KEY, useFirstWheelHint } from '../WordWheelHintFlag';

describe('useFirstWheelHint', () => {
  beforeEach(() => localStorage.clear());

  it('shows the how-to line in a player\'s first wheel round and marks it seen as it shows', () => {
    const { result } = renderHook(() => useFirstWheelHint());
    expect(result.current).toBe(true);
    expect(localStorage.getItem(WHEEL_HINT_SEEN_KEY)).toBe('1');
  });

  it('never shows it again in a later round, even if the first round was left without a word', () => {
    localStorage.setItem(WHEEL_HINT_SEEN_KEY, '1');
    const { result } = renderHook(() => useFirstWheelHint());
    expect(result.current).toBe(false);
  });
});
