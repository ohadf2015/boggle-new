/**
 * useMatchmaking hook tests
 */
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useMatchmaking } from '../useMatchmaking';

// Mock socket
const mockEmit = vi.fn();
const mockOn = vi.fn();
const mockOff = vi.fn();
const mockSocket = {
  emit: mockEmit,
  on: mockOn,
  off: mockOff,
  connected: true,
};

vi.mock('@/utils/SocketContext', () => ({
  getSharedSocketIfExists: () => mockSocket,
}));

describe('useMatchmaking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in idle state', () => {
    const { result } = renderHook(() => useMatchmaking());
    expect(result.current.status).toBe('idle');
    expect(result.current.opponent).toBeNull();
    expect(result.current.waitTime).toBe(0);
  });

  it('emits joinMatchmaking on joinQueue', () => {
    const { result } = renderHook(() => useMatchmaking());
    act(() => {
      result.current.joinQueue('classic', 'en');
    });
    expect(mockEmit).toHaveBeenCalledWith('joinMatchmaking', {
      gameMode: 'classic',
      language: 'en',
    });
    expect(result.current.status).toBe('searching');
  });

  it('emits leaveMatchmaking on leaveQueue', () => {
    const { result } = renderHook(() => useMatchmaking());
    act(() => {
      result.current.joinQueue('classic', 'en');
    });
    act(() => {
      result.current.leaveQueue();
    });
    expect(mockEmit).toHaveBeenCalledWith('leaveMatchmaking');
    expect(result.current.status).toBe('idle');
  });

  it('registers socket event listeners on mount', () => {
    renderHook(() => useMatchmaking());
    const registeredEvents = mockOn.mock.calls.map(
      (call: [string, unknown]) => call[0]
    );
    expect(registeredEvents).toContain('matchFound');
    expect(registeredEvents).toContain('matchmakingUpdate');
    expect(registeredEvents).toContain('matchmakingTimeout');
  });

  it('cleans up socket listeners on unmount', () => {
    const { unmount } = renderHook(() => useMatchmaking());
    unmount();
    const removedEvents = mockOff.mock.calls.map(
      (call: [string, unknown]) => call[0]
    );
    expect(removedEvents).toContain('matchFound');
    expect(removedEvents).toContain('matchmakingUpdate');
    expect(removedEvents).toContain('matchmakingTimeout');
  });
});
