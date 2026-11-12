import { describe, it, expect, vi, beforeEach } from 'vitest';

const publishLevelUp = vi.fn();
vi.mock('@/lib/avatar/revealTrigger', () => ({ publishLevelUp: (...a: unknown[]) => publishLevelUp(...a) }));

import { publishXpResponse } from '../publishXpResponse';
import { resetResultsXp, useResultsXp } from '../resultsXpStore';
import { renderHook } from '@testing-library/react';

beforeEach(() => {
  publishLevelUp.mockClear();
  resetResultsXp();
});

describe('publishXpResponse', () => {
  it('feeds the results slot and announces the level-up', () => {
    publishXpResponse('daily:word-wheel', { xpEarned: 60, newTotalXp: 900, levelUp: { oldLevel: 4, newLevel: 5 } }, 'wordWheel');
    const { result } = renderHook(() => useResultsXp('daily:word-wheel'));
    expect(result.current).toEqual({ gained: 60, total: 900 });
    expect(publishLevelUp).toHaveBeenCalledWith({ oldLevel: 4, newLevel: 5 }, 'wordWheel');
  });

  it('clears the slot and announces nothing when the response carries no XP', () => {
    publishXpResponse('daily:word-wheel', { success: true }, 'wordWheel');
    const { result } = renderHook(() => useResultsXp('daily:word-wheel'));
    expect(result.current).toBeNull();
    expect(publishLevelUp).not.toHaveBeenCalled();
  });
});
