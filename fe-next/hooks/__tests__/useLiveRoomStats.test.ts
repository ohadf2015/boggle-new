import { vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLiveRoomStats } from '../useLiveRoomStats';

// Mock the socket context
const mockSocket = {
  connected: true,
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
};

vi.mock('@/utils/SocketContext', () => ({
  useSocketOptional: () => ({
    socket: mockSocket,
    isConnected: true,
  }),
}));

describe('useLiveRoomStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial loading state', () => {
    const { result } = renderHook(() => useLiveRoomStats());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.openRooms).toBe(0);
    expect(result.current.totalPlayers).toBe(0);
    expect(result.current.activePlayers).toBe(0);
  });

  it('should emit getActiveRooms on mount', () => {
    renderHook(() => useLiveRoomStats());

    expect(mockSocket.emit).toHaveBeenCalledWith('getActiveRooms');
  });

  it('should register activeRooms event listener', () => {
    renderHook(() => useLiveRoomStats());

    expect(mockSocket.on).toHaveBeenCalledWith('activeRooms', expect.any(Function));
  });

  it('should calculate openRooms and totalPlayers from waiting rooms only', () => {
    const { result } = renderHook(() => useLiveRoomStats());

    // Get the callback registered for 'activeRooms'
    const activeRoomsCallback = mockSocket.on.mock.calls.find(
      (call: [string, (data: unknown) => void]) => call[0] === 'activeRooms'
    )?.[1];

    expect(activeRoomsCallback).toBeDefined();

    // Simulate receiving rooms data
    act(() => {
      activeRoomsCallback({
        rooms: [
          { gameCode: 'ABC', gameState: 'waiting', playerCount: 3 },
          { gameCode: 'DEF', gameState: 'waiting', playerCount: 2 },
          { gameCode: 'GHI', gameState: 'in-progress', playerCount: 5 },
        ],
      });
    });

    // openRooms and totalPlayers should only count waiting rooms
    expect(result.current.openRooms).toBe(2);
    expect(result.current.totalPlayers).toBe(5); // 3 + 2
  });

  it('should calculate activePlayers from waiting and in-progress rooms', () => {
    const { result } = renderHook(() => useLiveRoomStats());

    // Get the callback registered for 'activeRooms'
    const activeRoomsCallback = mockSocket.on.mock.calls.find(
      (call: [string, (data: unknown) => void]) => call[0] === 'activeRooms'
    )?.[1];

    expect(activeRoomsCallback).toBeDefined();

    // Simulate receiving rooms data
    act(() => {
      activeRoomsCallback({
        rooms: [
          { gameCode: 'ABC', gameState: 'waiting', playerCount: 3 },
          { gameCode: 'DEF', gameState: 'waiting', playerCount: 2 },
          { gameCode: 'GHI', gameState: 'in-progress', playerCount: 5 },
          { gameCode: 'JKL', gameState: 'finished', playerCount: 4 },
        ],
      });
    });

    // activePlayers should count waiting + in-progress rooms
    expect(result.current.activePlayers).toBe(10); // 3 + 2 + 5 (excludes finished)
  });

  it('should mark as not loading after receiving data', () => {
    const { result } = renderHook(() => useLiveRoomStats());

    const activeRoomsCallback = mockSocket.on.mock.calls.find(
      (call: [string, (data: unknown) => void]) => call[0] === 'activeRooms'
    )?.[1];

    act(() => {
      activeRoomsCallback({ rooms: [] });
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should call refresh when refresh function is called', () => {
    const { result } = renderHook(() => useLiveRoomStats());

    act(() => {
      result.current.refresh();
    });

    // Should emit getActiveRooms (initial + refresh = 2 times)
    expect(mockSocket.emit).toHaveBeenCalledWith('getActiveRooms');
    expect(mockSocket.emit).toHaveBeenCalledTimes(2);
  });

  it('should poll every 30 seconds', () => {
    renderHook(() => useLiveRoomStats());

    // Initial call
    expect(mockSocket.emit).toHaveBeenCalledTimes(1);

    // Advance by 30 seconds
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(mockSocket.emit).toHaveBeenCalledTimes(2);

    // Advance another 30 seconds
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(mockSocket.emit).toHaveBeenCalledTimes(3);
  });

  it('should exclude rooms in validating state from activePlayers', () => {
    const { result } = renderHook(() => useLiveRoomStats());

    const activeRoomsCallback = mockSocket.on.mock.calls.find(
      (call: [string, (data: unknown) => void]) => call[0] === 'activeRooms'
    )?.[1];

    act(() => {
      activeRoomsCallback({
        rooms: [
          { gameCode: 'ABC', gameState: 'waiting', playerCount: 3 },
          { gameCode: 'DEF', gameState: 'validating', playerCount: 4 },
          { gameCode: 'GHI', gameState: 'in-progress', playerCount: 5 },
        ],
      });
    });

    // activePlayers should only count waiting + in-progress
    expect(result.current.activePlayers).toBe(8); // 3 + 5 (excludes validating)
  });
});
