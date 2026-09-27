/**
 * useDrillRewards Hook Tests
 *
 * Tests for drill XP and gold reward calculation and awarding.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const { mockAddCoins } = vi.hoisted(() => {
  const mockAddCoins = vi.fn().mockResolvedValue(100);
  return { mockAddCoins };
});
vi.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({
    addCoins: mockAddCoins,
  }),
}));

// Import after mocks are set up
import { useDrillRewards, calculateDrillGold } from '../useDrillRewards';

// ─── calculateDrillGold (pure function) ──────────────────────────────────────

describe('calculateDrillGold', () => {
  it('awards base gold for level 1 with zero score', () => {
    expect(calculateDrillGold(1, 0)).toBe(5);
  });

  it('awards level * 5 as base gold', () => {
    expect(calculateDrillGold(3, 0)).toBe(15);
  });

  it('adds score bonus: floor(score / 20)', () => {
    expect(calculateDrillGold(1, 100)).toBe(5 + 5); // 5 base + 5 score bonus
  });

  it('level 5, score 500 gives 25 + 25 = 50', () => {
    expect(calculateDrillGold(5, 500)).toBe(50);
  });

  it('caps gold at 100', () => {
    expect(calculateDrillGold(5, 99999)).toBe(100);
  });

  it('never goes below 0', () => {
    expect(calculateDrillGold(0, 0)).toBeGreaterThanOrEqual(0);
  });

  it('score bonus floors correctly', () => {
    expect(calculateDrillGold(1, 19)).toBe(5); // score bonus = floor(19/20) = 0
    expect(calculateDrillGold(1, 20)).toBe(6); // score bonus = floor(20/20) = 1
  });
});

// ─── useDrillRewards hook ────────────────────────────────────────────────────

describe('useDrillRewards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddCoins.mockResolvedValue(100);
  });

  it('returns awardDrillRewards function', () => {
    const { result } = renderHook(() => useDrillRewards());
    expect(typeof result.current.awardDrillRewards).toBe('function');
  });

  it('calls addCoins with calculated gold amount', async () => {
    const { result } = renderHook(() => useDrillRewards());

    await act(async () => {
      await result.current.awardDrillRewards({ level: 1, score: 100, xpAwarded: 15 });
    });

    // level 1 base = 5, score bonus = floor(100/20) = 5, total = 10
    expect(mockAddCoins).toHaveBeenCalledWith(10, 'Brain Drill', { level: 1, score: 100 });
  });

  it('returns goldAwarded and xpAwarded in result', async () => {
    const { result } = renderHook(() => useDrillRewards());

    let rewardResult: Awaited<ReturnType<typeof result.current.awardDrillRewards>>;
    await act(async () => {
      rewardResult = await result.current.awardDrillRewards({ level: 2, score: 200, xpAwarded: 20 });
    });

    // level 2 base = 10, score bonus = floor(200/20) = 10, total = 20
    expect(rewardResult!.goldAwarded).toBe(20);
    expect(rewardResult!.xpAwarded).toBe(20);
  });

  it('does not award gold if score is 0 and level is 0', async () => {
    const { result } = renderHook(() => useDrillRewards());

    await act(async () => {
      await result.current.awardDrillRewards({ level: 0, score: 0, xpAwarded: 0 });
    });

    // gold = max(0, ...) should still call addCoins with 0 — which addCoins ignores internally
    expect(mockAddCoins).toHaveBeenCalledWith(0, 'Brain Drill', { level: 0, score: 0 });
  });

  it('passes xpAwarded through without modification', async () => {
    const { result } = renderHook(() => useDrillRewards());

    let rewardResult: Awaited<ReturnType<typeof result.current.awardDrillRewards>>;
    await act(async () => {
      rewardResult = await result.current.awardDrillRewards({ level: 3, score: 300, xpAwarded: 42 });
    });

    expect(rewardResult!.xpAwarded).toBe(42);
  });

  it('handles addCoins failure gracefully', async () => {
    mockAddCoins.mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useDrillRewards());

    let rewardResult: Awaited<ReturnType<typeof result.current.awardDrillRewards>>;
    await act(async () => {
      rewardResult = await result.current.awardDrillRewards({ level: 1, score: 100, xpAwarded: 10 });
    });

    // Should still return xpAwarded but goldAwarded = 0 on failure
    expect(rewardResult!.xpAwarded).toBe(10);
    expect(rewardResult!.goldAwarded).toBe(0);
  });
});
