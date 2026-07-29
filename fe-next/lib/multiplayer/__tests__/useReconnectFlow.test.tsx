// @vitest-environment happy-dom
/**
 * TDD RED: useReconnectFlow — Phase 3.6 reconnect wiring
 *
 * - Shows overlay when isReconnecting + gameActive
 * - Sets showAbortModal on reconnect_failed
 * - Emits resume on socket connect after prior in-game disconnect
 * - Tracks lastServerSeq from scoreUpdate
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

// --- Mocks ---

const mockGetReconnectAttempt = vi.fn().mockReturnValue(0);
const mockSocket = {
  connected: true,
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
};

vi.mock('@/utils/SocketContext', () => ({
  useSocket: vi.fn(() => ({
    socket: mockSocket,
    isConnected: true,
    isReconnecting: false,
    connectionError: null,
    getReconnectAttempt: mockGetReconnectAttempt,
    maxReconnectAttempts: 30,
    manualReconnect: vi.fn(),
  })),
}));

import { useSocket } from '@/utils/SocketContext';
import { useReconnectFlow } from '../useReconnectFlow';

// Helper to capture socket event handlers
function captureHandlers(socketMock: typeof mockSocket) {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
  socketMock.on.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
    handlers[event] = handlers[event] || [];
    handlers[event].push(handler);
  });
  return handlers;
}

describe('useReconnectFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetReconnectAttempt.mockReturnValue(0);
    mockSocket.connected = true;
    mockSocket.on.mockReset();
    mockSocket.off.mockReset();
    mockSocket.emit.mockReset();
  });

  it('returns isReconnecting false when socket is connected', () => {
    vi.mocked(useSocket).mockReturnValue({
      socket: mockSocket as any,
      isConnected: true,
      isReconnecting: false,
      connectionError: null,
      getReconnectAttempt: mockGetReconnectAttempt,
      maxReconnectAttempts: 30,
      manualReconnect: vi.fn(),
    });

    const { result } = renderHook(() =>
      useReconnectFlow({ gameCode: 'G1', username: 'alice', gameActive: true })
    );
    expect(result.current.isReconnecting).toBe(false);
    expect(result.current.showAbortModal).toBe(false);
  });

  it('returns isReconnecting true when socket context is reconnecting', () => {
    vi.mocked(useSocket).mockReturnValue({
      socket: mockSocket as any,
      isConnected: false,
      isReconnecting: true,
      connectionError: null,
      getReconnectAttempt: mockGetReconnectAttempt,
      maxReconnectAttempts: 30,
      manualReconnect: vi.fn(),
    });

    const { result } = renderHook(() =>
      useReconnectFlow({ gameCode: 'G1', username: 'alice', gameActive: true })
    );
    expect(result.current.isReconnecting).toBe(true);
  });

  it('sets showAbortModal to true when reconnect_failed fires on socket', () => {
    const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
    mockSocket.on.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      handlers[event] = handlers[event] || [];
      handlers[event].push(handler);
    });

    const { result } = renderHook(() =>
      useReconnectFlow({ gameCode: 'G1', username: 'alice', gameActive: true })
    );

    expect(result.current.showAbortModal).toBe(false);

    act(() => {
      handlers['reconnect_failed']?.forEach(h => h());
    });

    expect(result.current.showAbortModal).toBe(true);
  });

  it('emits resume on socket connect when game was active before disconnect', () => {
    const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
    mockSocket.on.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      handlers[event] = handlers[event] || [];
      handlers[event].push(handler);
    });

    renderHook(() =>
      useReconnectFlow({ gameCode: 'GAME1', username: 'bob', gameActive: true })
    );

    // Simulate disconnect then reconnect
    act(() => { handlers['disconnect']?.forEach(h => h('transport error')); });
    act(() => { handlers['connect']?.forEach(h => h()); });

    expect(mockSocket.emit).toHaveBeenCalledWith('resume', expect.objectContaining({
      gameCode: 'GAME1',
      username: 'bob',
      lastServerSeq: expect.any(Number),
    }));
  });

  it('does NOT emit resume on first connect (not a reconnect)', () => {
    const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
    mockSocket.on.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      handlers[event] = handlers[event] || [];
      handlers[event].push(handler);
    });

    renderHook(() =>
      useReconnectFlow({ gameCode: 'GAME1', username: 'bob', gameActive: true })
    );

    // Only connect — no prior disconnect
    act(() => { handlers['connect']?.forEach(h => h()); });

    expect(mockSocket.emit).not.toHaveBeenCalledWith('resume', expect.anything());
  });

  it('updates lastServerSeq from scoreUpdate events', () => {
    const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
    mockSocket.on.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      handlers[event] = handlers[event] || [];
      handlers[event].push(handler);
    });

    const { result } = renderHook(() =>
      useReconnectFlow({ gameCode: 'G1', username: 'alice', gameActive: true })
    );

    expect(result.current.lastServerSeq).toBe(0);

    act(() => {
      handlers['scoreUpdate']?.forEach(h => h({ serverSeq: 5, username: 'alice', deltaScore: 3, totalScore: 23 }));
    });

    expect(result.current.lastServerSeq).toBe(5);
  });

  it('forwards maxReconnectAttempts from socket context', () => {
    vi.mocked(useSocket).mockReturnValue({
      socket: mockSocket as any,
      isConnected: true,
      isReconnecting: false,
      connectionError: null,
      getReconnectAttempt: mockGetReconnectAttempt,
      maxReconnectAttempts: 20,
      manualReconnect: vi.fn(),
    });

    const { result } = renderHook(() =>
      useReconnectFlow({ gameCode: 'G1', username: 'alice', gameActive: true })
    );
    expect(result.current.maxReconnectAttempts).toBe(20);
  });

  it('forwards isServerUpdating from socket context (planned deploy)', () => {
    vi.mocked(useSocket).mockReturnValue({
      socket: mockSocket as any,
      isConnected: false,
      isReconnecting: true,
      isServerUpdating: true,
      connectionError: null,
      getReconnectAttempt: mockGetReconnectAttempt,
      maxReconnectAttempts: 30,
      manualReconnect: vi.fn(),
    });

    const { result } = renderHook(() =>
      useReconnectFlow({ gameCode: 'G1', username: 'alice', gameActive: true })
    );
    expect(result.current.isServerUpdating).toBe(true);
  });

  it('defaults isServerUpdating to false when the context omits it', () => {
    // Context with NO isServerUpdating key → hook must coerce to false, never
    // undefined. Set explicitly (clearAllMocks does not reset prior
    // mockReturnValue implementations, so we can't rely on the factory default).
    vi.mocked(useSocket).mockReturnValue({
      socket: mockSocket as any,
      isConnected: true,
      isReconnecting: false,
      connectionError: null,
      getReconnectAttempt: mockGetReconnectAttempt,
      maxReconnectAttempts: 30,
      manualReconnect: vi.fn(),
    });

    const { result } = renderHook(() =>
      useReconnectFlow({ gameCode: 'G1', username: 'alice', gameActive: true })
    );
    expect(result.current.isServerUpdating).toBe(false);
  });

  it('dismissAbortModal clears showAbortModal', () => {
    const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
    mockSocket.on.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      handlers[event] = handlers[event] || [];
      handlers[event].push(handler);
    });

    const { result } = renderHook(() =>
      useReconnectFlow({ gameCode: 'G1', username: 'alice', gameActive: true })
    );

    act(() => { handlers['reconnect_failed']?.forEach(h => h()); });
    expect(result.current.showAbortModal).toBe(true);

    act(() => { result.current.dismissAbortModal(); });
    expect(result.current.showAbortModal).toBe(false);
  });
});
