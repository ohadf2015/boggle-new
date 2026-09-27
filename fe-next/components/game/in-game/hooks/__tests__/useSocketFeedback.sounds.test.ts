/**
 * TDD tests for server-truth sound feedback in useSocketFeedback.
 *
 * Fix: MP audio-lie. Accept sound must play ONLY when server confirms
 * (wordAccepted event). Reject sound + error haptic must fire on all three
 * server rejection events (wordRejected, wordNotOnBoard, wordTooShort).
 *
 * Written BEFORE implementation (RED phase).
 */
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockHapticError, mockHapticWordAccepted } = vi.hoisted(() => ({
  mockHapticError: vi.fn(),
  mockHapticWordAccepted: vi.fn(),
}));
vi.mock('@/utils/haptics', () => ({
  hapticError: (...args: any[]) => mockHapticError(...args),
  hapticWordAccepted: (...args: any[]) => mockHapticWordAccepted(...args),
  hapticForWordScore: vi.fn(),
}));

import { useSocketFeedback } from '../useSocketFeedback';

interface MockSocket {
  handlers: Record<string, (data: any) => void>;
  on: (event: string, handler: (data: any) => void) => void;
  off: (event: string, handler: (data: any) => void) => void;
  emit: (event: string, data: any) => void;
}

function createMockSocket(): MockSocket {
  const handlers: Record<string, (data: any) => void> = {};
  return {
    handlers,
    on: vi.fn((event: string, handler: (data: any) => void) => {
      handlers[event] = handler;
    }),
    off: vi.fn(),
    emit: vi.fn(),
  };
}

function buildOptions(socket: MockSocket, overrides: Record<string, any> = {}) {
  return {
    socket: socket as any,
    isPlaying: true,
    t: (k: string) => k,
    setCurrentFeedback: vi.fn(),
    setLastWordFoundTime: vi.fn(),
    playWordAcceptedSound: vi.fn(),
    playWordRejectedSound: vi.fn(),
    ...overrides,
  };
}

describe('useSocketFeedback — server-truth sound feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('plays accepted sound on wordAccepted event', () => {
    const socket = createMockSocket();
    const playWordAcceptedSound = vi.fn();
    const playWordRejectedSound = vi.fn();
    renderHook(() => useSocketFeedback(buildOptions(socket, { playWordAcceptedSound, playWordRejectedSound })));

    socket.handlers['wordAccepted']?.({ word: 'TEST', score: 10 });

    expect(playWordAcceptedSound).toHaveBeenCalledTimes(1);
    expect(playWordRejectedSound).not.toHaveBeenCalled();
  });

  it('fires accept haptic on wordAccepted event (server-truth pulse)', () => {
    const socket = createMockSocket();
    renderHook(() => useSocketFeedback(buildOptions(socket)));

    socket.handlers['wordAccepted']?.({ word: 'TEST', score: 10 });

    expect(mockHapticWordAccepted).toHaveBeenCalledTimes(1);
    expect(mockHapticError).not.toHaveBeenCalled();
  });

  it('plays rejected sound and error haptic on wordRejected event', () => {
    const socket = createMockSocket();
    const playWordAcceptedSound = vi.fn();
    const playWordRejectedSound = vi.fn();
    renderHook(() => useSocketFeedback(buildOptions(socket, { playWordAcceptedSound, playWordRejectedSound })));

    socket.handlers['wordRejected']?.({ word: 'TEST', reason: 'not_in_dictionary' });

    expect(playWordRejectedSound).toHaveBeenCalledTimes(1);
    expect(mockHapticError).toHaveBeenCalledTimes(1);
    expect(playWordAcceptedSound).not.toHaveBeenCalled();
  });

  it('plays rejected sound and error haptic on wordNotOnBoard event', () => {
    const socket = createMockSocket();
    const playWordAcceptedSound = vi.fn();
    const playWordRejectedSound = vi.fn();
    renderHook(() => useSocketFeedback(buildOptions(socket, { playWordAcceptedSound, playWordRejectedSound })));

    socket.handlers['wordNotOnBoard']?.({ word: 'TEST' });

    expect(playWordRejectedSound).toHaveBeenCalledTimes(1);
    expect(mockHapticError).toHaveBeenCalledTimes(1);
    expect(playWordAcceptedSound).not.toHaveBeenCalled();
  });

  it('plays rejected sound and error haptic on wordTooShort event', () => {
    const socket = createMockSocket();
    const playWordAcceptedSound = vi.fn();
    const playWordRejectedSound = vi.fn();
    renderHook(() => useSocketFeedback(buildOptions(socket, { playWordAcceptedSound, playWordRejectedSound })));

    socket.handlers['wordTooShort']?.({ word: 'TE', minLength: 3 });

    expect(playWordRejectedSound).toHaveBeenCalledTimes(1);
    expect(mockHapticError).toHaveBeenCalledTimes(1);
    expect(playWordAcceptedSound).not.toHaveBeenCalled();
  });

  it('does not play accepted sound on wordAlreadyFound event', () => {
    const socket = createMockSocket();
    const playWordAcceptedSound = vi.fn();
    const playWordRejectedSound = vi.fn();
    renderHook(() => useSocketFeedback(buildOptions(socket, { playWordAcceptedSound, playWordRejectedSound })));

    socket.handlers['wordAlreadyFound']?.({ word: 'TEST' });

    expect(playWordAcceptedSound).not.toHaveBeenCalled();
  });
});
