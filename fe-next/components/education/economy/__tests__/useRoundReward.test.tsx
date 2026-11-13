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

const publishLevelUp = vi.hoisted(() => vi.fn());
vi.mock('@/lib/avatar/revealTrigger', () => ({ publishLevelUp }));

import { useRoundReward } from '../useRoundReward';

const reveal = { gameCode: 'ABC', roundId: '7', rarity: 'rare', xp: 25, itemId: 'tile-neon', roundCash: 9, rank: 1, size: 3 };

beforeEach(() => {
  emit.mockClear();
  publishLevelUp.mockClear();
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

  it('Given the results stay up into the next round, When the round id changes, Then the student asks for the new chest and drops the old one', () => {
    const { result, rerender } = renderHook(({ round }) => useRoundReward('ABC', round), { initialProps: { round: '7' } });
    act(() => listeners['classroomEconomy:reward'](reveal));
    emit.mockClear();
    rerender({ round: '8' });
    expect(result.current).toBeNull();
    expect(emit).toHaveBeenCalledWith('classroomEconomy:requestReward', { gameCode: 'ABC', roundId: '8' });
  });

  it('Given a reveal for another round, Then it is ignored', () => {
    const { result } = renderHook(() => useRoundReward('ABC', '7'));
    act(() => listeners['classroomEconomy:reward']({ ...reveal, roundId: '6' }));
    expect(result.current).toBeNull();
  });

  it('Given the chest levelled the student up, When the reveal arrives, Then the level-up is published once for the chest', () => {
    renderHook(() => useRoundReward('ABC', '7'));
    act(() => listeners['classroomEconomy:reward']({ ...reveal, levelUp: { oldLevel: 4, newLevel: 5 } }));
    expect(publishLevelUp).toHaveBeenCalledTimes(1);
    expect(publishLevelUp).toHaveBeenCalledWith({ oldLevel: 4, newLevel: 5 }, 'classroomChest');
  });

  it('Given a levelling reveal for another round, Then nothing is published', () => {
    renderHook(() => useRoundReward('ABC', '7'));
    act(() => listeners['classroomEconomy:reward']({ ...reveal, roundId: '6', levelUp: { oldLevel: 4, newLevel: 5 } }));
    expect(publishLevelUp).not.toHaveBeenCalled();
  });

  it('Given a reveal without a level-up, Then nothing is published', () => {
    renderHook(() => useRoundReward('ABC', '7'));
    act(() => listeners['classroomEconomy:reward'](reveal));
    expect(publishLevelUp).not.toHaveBeenCalled();
  });

  it('Given the server says the round is not settled, When it retries, Then the request is sent again', () => {
    renderHook(() => useRoundReward('ABC', '7'));
    act(() => listeners['classroomEconomy:reward'](null));
    expect(emit).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(2000));
    expect(emit).toHaveBeenCalledTimes(2);
  });
});
