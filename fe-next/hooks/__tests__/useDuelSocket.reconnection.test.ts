// @ts-nocheck
import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock socket.io-client
const mockSocket = {
  connected: false,
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    profile: { display_name: 'Test User' },
  }),
}));

import { useDuelSocket } from '../useDuelSocket';

describe('useDuelSocket — reconnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
    mockSocket.on.mockReset();
    mockSocket.off.mockReset();
  });

  it('exposes connectionStatus state defaulting to disconnected', () => {
    const { result } = renderHook(() => useDuelSocket());
    expect(result.current.connectionStatus).toBe('disconnected');
  });

  it('sets connectionStatus to connected on connect event', () => {
    const { result } = renderHook(() => useDuelSocket());

    // Find the connect handler
    const connectCall = mockSocket.on.mock.calls.find(([event]) => event === 'connect');
    expect(connectCall).toBeTruthy();

    act(() => {
      connectCall[1]();
    });

    expect(result.current.connectionStatus).toBe('connected');
  });

  it('sets connectionStatus to reconnecting on reconnect_attempt event', () => {
    const { result } = renderHook(() => useDuelSocket());

    const reconnectAttemptCall = mockSocket.on.mock.calls.find(
      ([event]) => event === 'reconnect_attempt'
    );
    expect(reconnectAttemptCall).toBeTruthy();

    act(() => {
      reconnectAttemptCall[1]();
    });

    expect(result.current.connectionStatus).toBe('reconnecting');
  });

  it('sets connectionStatus to disconnected on disconnect event', () => {
    const { result } = renderHook(() => useDuelSocket());

    // First connect
    const connectCall = mockSocket.on.mock.calls.find(([event]) => event === 'connect');
    act(() => { connectCall[1](); });

    // Then disconnect
    const disconnectCall = mockSocket.on.mock.calls.find(([event]) => event === 'disconnect');
    act(() => { disconnectCall[1](); });

    expect(result.current.connectionStatus).toBe('disconnected');
  });

  it('fires onReconnect callback when reconnecting after previous connection', () => {
    const onReconnect = vi.fn();
    const { result } = renderHook(() => useDuelSocket({ onReconnect }));

    // Simulate connect
    const connectCall = mockSocket.on.mock.calls.find(([event]) => event === 'connect');
    act(() => { connectCall[1](); });

    // Simulate disconnect
    const disconnectCall = mockSocket.on.mock.calls.find(([event]) => event === 'disconnect');
    act(() => { disconnectCall[1](); });

    // Simulate reconnect (second connect)
    act(() => { connectCall[1](); });

    expect(onReconnect).toHaveBeenCalled();
  });

  it('socket options include reconnection settings', async () => {
    const { io } = await import('socket.io-client');
    renderHook(() => useDuelSocket());

    expect(io).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      })
    );
  });
});
