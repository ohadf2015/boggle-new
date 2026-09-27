/**
 * Tests for useClassroomRewardListener.
 *
 * Listens to the enriched classroomGameEnded socket event (F-24) and
 * surfaces the current user's reward (xpEarned + lessonIds) to the UI so
 * a celebration toast or modal can fire.
 */

import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// --- Mock useSocketOptional ---------------------------------------------
const handlers: Record<string, ((data: unknown) => void) | undefined> = {};
const mockSocket = {
  on: vi.fn((event: string, handler: (data: unknown) => void) => {
    handlers[event] = handler;
  }),
  off: vi.fn((event: string) => {
    delete handlers[event];
  }),
};

vi.mock('@/utils/SocketContext', () => ({
  useSocketOptional: () => ({ socket: mockSocket, isConnected: true }),
}));

import { useClassroomRewardListener } from '../useClassroomRewardListener';

describe('useClassroomRewardListener', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(handlers)) delete handlers[k];
  });

  it('returns null before any reward event fires', () => {
    const { result } = renderHook(() => useClassroomRewardListener('stu-1'));
    expect(result.current.reward).toBeNull();
  });

  it('captures the current user reward when classroomGameEnded fires', () => {
    const { result } = renderHook(() => useClassroomRewardListener('stu-1'));

    act(() => {
      handlers['classroomGameEnded']?.({
        gameCode: 'GAME01',
        rewards: [
          { userId: 'stu-1', xpEarned: 30, lessonIds: ['l1', 'l2'] },
          { userId: 'stu-2', xpEarned: 10, lessonIds: ['l1', 'l2'] },
        ],
      });
    });

    expect(result.current.reward).toEqual({
      userId: 'stu-1',
      xpEarned: 30,
      lessonIds: ['l1', 'l2'],
      gameCode: 'GAME01',
    });
  });

  it('ignores rewards for other users', () => {
    const { result } = renderHook(() => useClassroomRewardListener('stu-1'));

    act(() => {
      handlers['classroomGameEnded']?.({
        gameCode: 'GAME01',
        rewards: [{ userId: 'stu-2', xpEarned: 40, lessonIds: ['l1'] }],
      });
    });

    expect(result.current.reward).toBeNull();
  });

  it('ignores rewards with zero xpEarned (nothing to celebrate)', () => {
    const { result } = renderHook(() => useClassroomRewardListener('stu-1'));

    act(() => {
      handlers['classroomGameEnded']?.({
        gameCode: 'GAME01',
        rewards: [{ userId: 'stu-1', xpEarned: 0, lessonIds: ['l1'] }],
      });
    });

    expect(result.current.reward).toBeNull();
  });

  it('clearReward() resets state so consumers can dismiss the toast', () => {
    const { result } = renderHook(() => useClassroomRewardListener('stu-1'));

    act(() => {
      handlers['classroomGameEnded']?.({
        gameCode: 'GAME01',
        rewards: [{ userId: 'stu-1', xpEarned: 25, lessonIds: ['l1'] }],
      });
    });
    expect(result.current.reward).not.toBeNull();

    act(() => {
      result.current.clearReward();
    });
    expect(result.current.reward).toBeNull();
  });

  it('unsubscribes from the socket on unmount', () => {
    const { unmount } = renderHook(() => useClassroomRewardListener('stu-1'));
    expect(mockSocket.on).toHaveBeenCalledWith('classroomGameEnded', expect.any(Function));
    unmount();
    expect(mockSocket.off).toHaveBeenCalledWith('classroomGameEnded', expect.any(Function));
  });
});
