import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RESCUE_MS, bracesSpent, rescueMinLen, useBrace } from '../useBrace';
import { trackGrowthEvent } from '@/utils/growthTracking';

vi.mock('@/utils/growthTracking');

const base = () => ({
  brace: vi.fn(() => true),
  freeBraces: 0,
  district: 1,
  runCoins: 500,
  floors: 6,
  risk: 0.5,
  over: false,
  onReject: vi.fn(),
});

beforeEach(() => vi.useFakeTimers());

describe('brace pricing', () => {
  it('given paid braces, then what they cost adds up (40, then 80)', () => {
    expect(bracesSpent(0, 1)).toBe(0);
    expect(bracesSpent(2, 1)).toBe(120);
  });

  it('given rescues used, then each next rescue word must be longer', () => {
    expect(rescueMinLen(0)).toBe(5);
    expect(rescueMinLen(1)).toBe(6);
  });
});

describe('useBrace', () => {
  it('given a steady tower, then no brace is offered', () => {
    const { result } = renderHook(() => useBrace({ ...base(), risk: 0.1 }));
    expect(result.current.offered).toBe(false);
  });

  it('given a wobbling tower and enough run coins, when bought, then the tower is braced as PAID and the price comes off the run', () => {
    const args = base();
    const { result } = renderHook(() => useBrace(args));
    expect(result.current.offered).toBe(true);
    expect(result.current.price).toBe(40);
    act(() => result.current.buy());
    expect(args.brace).toHaveBeenCalledWith(true);
    expect(result.current.spent).toBe(40);
    expect(result.current.price).toBe(80);
  });

  it('given a free brace from upgrades, when used, then it is braced as NOT paid', () => {
    const args = { ...base(), freeBraces: 1 };
    const { result } = renderHook(() => useBrace(args));
    expect(result.current.price).toBe(0);
    act(() => result.current.buy());
    expect(args.brace).toHaveBeenCalledWith(false);
    expect(result.current.spent).toBe(0);
  });

  it('given too few run coins, then buying does nothing', () => {
    const args = { ...base(), runCoins: 10 };
    const { result } = renderHook(() => useBrace(args));
    expect(result.current.affordable).toBe(false);
    act(() => result.current.buy());
    expect(args.brace).not.toHaveBeenCalled();
  });

  it('given a rescue word challenge, when the word is too short or not real, then it is refused and nothing is braced', () => {
    const args = base();
    const { result } = renderHook(() => useBrace(args));
    act(() => result.current.startRescue());
    expect(result.current.rescue).toMatchObject({ minLen: 5 });
    let taken = false;
    act(() => {
      taken = result.current.submitRescue('town', true);
    });
    expect(taken).toBe(true);
    expect(args.onReject).toHaveBeenLastCalledWith('rescue_short');
    act(() => {
      result.current.submitRescue('xqzzy', false);
    });
    expect(args.onReject).toHaveBeenLastCalledWith('not_in_dictionary');
    expect(args.brace).not.toHaveBeenCalled();
    expect(result.current.rescue).not.toBeNull();
  });

  it('given no rescue running, when a word is submitted, then the rescue does not take it', () => {
    const { result } = renderHook(() => useBrace(base()));
    expect(result.current.submitRescue('tower', true)).toBe(false);
  });

  it('given the 5-letter rescue, when "tower" is spelled, then braced free and the challenge ends', () => {
    const args = base();
    const { result } = renderHook(() => useBrace(args));
    act(() => result.current.startRescue());
    act(() => {
      result.current.submitRescue('tower', true);
    });
    expect(args.brace).toHaveBeenCalledWith(false);
    expect(result.current.rescue).toBeNull();
    expect(result.current.rescuesLeft).toBe(1);
  });

  it('given the rescue timer runs out, then the challenge ends without a brace', () => {
    const args = base();
    const { result } = renderHook(() => useBrace(args));
    act(() => result.current.startRescue());
    act(() => vi.advanceTimersByTime(RESCUE_MS + 50));
    expect(result.current.rescue).toBeNull();
    expect(args.brace).not.toHaveBeenCalled();
  });

  describe('wt2_continue_used tracking', () => {
    it('should track paid brace with actual cost (not 0), and costs should differ on consecutive braces', () => {
      const mockTrack = vi.mocked(trackGrowthEvent);
      const args = base();
      const { result } = renderHook(() => useBrace(args));

      // First brace purchase
      expect(result.current.price).toBe(40);
      act(() => result.current.buy());
      expect(args.brace).toHaveBeenCalledWith(true);

      // Second brace purchase
      expect(result.current.price).toBe(80);
      act(() => result.current.buy());

      // Verify that wt2_continue_used was fired twice with correct costs
      const continuedUsedCalls = mockTrack.mock.calls.filter(([name]) => name === 'wt2_continue_used');
      expect(continuedUsedCalls.length).toBe(2);

      // First cost must be 40
      expect(continuedUsedCalls[0]?.[1]).toEqual({ cost: 40 });
      // Second cost must be 80
      expect(continuedUsedCalls[1]?.[1]).toEqual({ cost: 80 });

      // Verify they're different (not placeholder values)
      expect(continuedUsedCalls[0]?.[1]?.cost).not.toBe(0);
      expect(continuedUsedCalls[1]?.[1]?.cost).not.toBe(0);
      expect(continuedUsedCalls[0]?.[1]?.cost).not.toBe(continuedUsedCalls[1]?.[1]?.cost);
    });

    it('should not track when free braces are used', () => {
      const mockTrack = vi.mocked(trackGrowthEvent);
      const args = { ...base(), freeBraces: 1 };
      const { result } = renderHook(() => useBrace(args));

      expect(result.current.price).toBe(0);
      act(() => result.current.buy());
      expect(args.brace).toHaveBeenCalledWith(false);

      const continuedUsedCalls = mockTrack.mock.calls.filter(([name]) => name === 'wt2_continue_used');
      expect(continuedUsedCalls.length).toBe(0);
    });

    it('should not track when brace fails (brace returns false)', () => {
      const mockTrack = vi.mocked(trackGrowthEvent);
      const args = { ...base(), brace: vi.fn(() => false) };
      const { result } = renderHook(() => useBrace(args));

      act(() => result.current.buy());

      const continuedUsedCalls = mockTrack.mock.calls.filter(([name]) => name === 'wt2_continue_used');
      expect(continuedUsedCalls.length).toBe(0);
    });

    it('should not track rescue word brace (free)', () => {
      const mockTrack = vi.mocked(trackGrowthEvent);
      const args = base();
      const { result } = renderHook(() => useBrace(args));

      act(() => result.current.startRescue());
      act(() => {
        result.current.submitRescue('tower', true);
      });
      expect(args.brace).toHaveBeenCalledWith(false);

      const continuedUsedCalls = mockTrack.mock.calls.filter(([name]) => name === 'wt2_continue_used');
      expect(continuedUsedCalls.length).toBe(0);
    });
  });
});
