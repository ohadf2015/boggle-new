'use client';

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useClassroomGameJuice } from '../useClassroomGameJuice';
import type { Socket } from 'socket.io-client';

// Mock sound effects
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playMatchFoundSound: vi.fn(),
    playCoinCascadeSound: vi.fn(),
    playWordAcceptedSound: vi.fn(),
    playWordRejectedSound: vi.fn(),
  }),
}));

vi.mock('@/hooks/useModeSting', () => ({
  useModeSting: () => ({
    playModeSound: vi.fn(),
  }),
}));

describe('useClassroomGameJuice', () => {
  let mockSocket: Partial<Socket>;

  beforeEach(() => {
    mockSocket = {
      on: vi.fn(function (event: string, callback: any) {
        (this as any)[`_${event}_callback`] = callback;
      }),
      off: vi.fn(),
      emit: vi.fn(),
    };

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('initializes with empty juice state', () => {
    const { result } = renderHook(() =>
      useClassroomGameJuice({
        socket: mockSocket as Socket,
        gameMode: 'classic',
        isPlaying: true,
      })
    );

    expect(result.current.recentScorerIds.size).toBe(0);
    expect(result.current.comboPlayers.size).toBe(0);
  });

  it('triggers confetti on correct answer event', () => {
    const { result } = renderHook(() =>
      useClassroomGameJuice({
        socket: mockSocket as Socket,
        gameMode: 'classic',
        isPlaying: true,
      })
    );

    // Manually trigger the callback
    act(() => {
      const callback = (mockSocket.on as any).mock.calls.find(
        (call: any) => call[0] === 'correct_answer'
      )?.[1];

      if (callback) {
        callback({
          studentId: 'student1',
          studentName: 'Alice',
          points: 10,
          gameMode: 'classic',
        });
      }
    });

    expect(result.current.shouldShowConfetti('student1')).toBe(true);
  });

  it('clears confetti after CONFETTI_DURATION_MS', () => {
    const { result } = renderHook(() =>
      useClassroomGameJuice({
        socket: mockSocket as Socket,
        gameMode: 'classic',
        isPlaying: true,
      })
    );

    act(() => {
      const callback = (mockSocket.on as any).mock.calls.find(
        (call: any) => call[0] === 'correct_answer'
      )?.[1];

      if (callback) {
        callback({
          studentId: 'student1',
          studentName: 'Alice',
          points: 10,
          gameMode: 'classic',
        });
      }
    });

    expect(result.current.shouldShowConfetti('student1')).toBe(true);

    // Advance time past the confetti duration
    act(() => {
      vi.advanceTimersByTime(900);
    });

    expect(result.current.shouldShowConfetti('student1')).toBe(false);
  });

  it('tracks combo levels for players', () => {
    const { result } = renderHook(() =>
      useClassroomGameJuice({
        socket: mockSocket as Socket,
        gameMode: 'classic',
        isPlaying: true,
      })
    );

    act(() => {
      const callback = (mockSocket.on as any).mock.calls.find(
        (call: any) => call[0] === 'correct_answer'
      )?.[1];

      if (callback) {
        callback({
          studentId: 'student1',
          studentName: 'Alice',
          points: 10,
          comboLevel: 5,
          gameMode: 'classic',
        });
      }
    });

    expect(result.current.getComboLevel('student1')).toBe(5);
  });

  it('does not listen to events when socket is null', () => {
    const { result } = renderHook(() =>
      useClassroomGameJuice({
        socket: null,
        gameMode: 'classic',
        isPlaying: true,
      })
    );

    expect(result.current.recentScorerIds.size).toBe(0);
  });

  it('does not listen to events when not playing', () => {
    const { result } = renderHook(() =>
      useClassroomGameJuice({
        socket: mockSocket as Socket,
        gameMode: 'classic',
        isPlaying: false,
      })
    );

    expect(result.current.recentScorerIds.size).toBe(0);
  });

  it('cleans up event listeners on unmount', () => {
    const { unmount } = renderHook(() =>
      useClassroomGameJuice({
        socket: mockSocket as Socket,
        gameMode: 'classic',
        isPlaying: true,
      })
    );

    unmount();

    // Verify off() was called
    expect(mockSocket.off).toHaveBeenCalled();
  });
});
