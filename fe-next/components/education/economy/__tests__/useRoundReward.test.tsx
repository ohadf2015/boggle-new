import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const emit = vi.fn();
const listeners: Record<string, (data: unknown) => void> = {};
vi.mock('@/utils/SocketContext', () => ({
  useSocketEmit: () => emit,
  useSocketEvent: (event: string, handler: (data: unknown) => void) => {
    listeners[event] = handler;
  },
}));

import { useRoundReward } from '../useRoundReward';

const reveal = { gameCode: 'ABC', roundId: '7', rarity: 'rare', xp: 25, itemId: 'tile-neon', roundCash: 9, rank: 1, size: 3 };

beforeEach(() => {
  emit.mockClear();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('useRoundReward', () => {
  it('Given a round that just ended, When mounted, Then the student asks the server for that round', () => {
    renderHook(() => useRoundReward('ABC', '7'));
    expect(emit).toHaveBeenCalledWith('classroomEconomy:requestReward', { gameCode: 'ABC', roundId: '7' });
  });

  it('Given the server reveal for this round, Then the hook returns it', () => {
    const { result } = renderHook(() => useRoundReward('ABC', '7'));
    act(() => listeners['classroomEconomy:reward'](reveal));
    expect(result.current).toEqual(reveal);
  });

  it('Given a reveal for another round, Then it is ignored', () => {
    const { result } = renderHook(() => useRoundReward('ABC', '7'));
    act(() => listeners['classroomEconomy:reward']({ ...reveal, roundId: '6' }));
    expect(result.current).toBeNull();
  });

  it('Given the server says the round is not settled, When it retries, Then the request is sent again', () => {
    renderHook(() => useRoundReward('ABC', '7'));
    act(() => listeners['classroomEconomy:reward'](null));
    expect(emit).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(2000));
    expect(emit).toHaveBeenCalledTimes(2);
  });
});
