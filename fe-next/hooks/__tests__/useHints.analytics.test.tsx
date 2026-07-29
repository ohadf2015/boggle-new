import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Socket } from 'socket.io-client';
import type { HintPayload } from '@/shared/types/socket';

vi.mock('@/utils/growthTracking', () => ({
  trackHintUsed: vi.fn(),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playHintRevealSound: vi.fn(),
  }),
}));

import { useHints } from '@/hooks/useHints';
import { trackHintUsed } from '@/utils/growthTracking';

type Handler = (...args: unknown[]) => void;

function createFakeSocket() {
  const handlers: Record<string, Handler[]> = {};
  const socket = {
    on: vi.fn((event: string, cb: Handler) => {
      (handlers[event] ||= []).push(cb);
      return socket;
    }),
    off: vi.fn((event: string, cb: Handler) => {
      handlers[event] = (handlers[event] || []).filter((h) => h !== cb);
      return socket;
    }),
    emit: vi.fn(),
  } as unknown as Socket & { __emit: (event: string, payload: unknown) => void };
  (socket as unknown as { __emit: (event: string, payload: unknown) => void }).__emit = (
    event,
    payload,
  ) => {
    (handlers[event] || []).forEach((h) => h(payload));
  };
  return socket;
}

describe('useHints analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fires trackHintUsed when hintResponse arrives, with hintType from payload', () => {
    const socket = createFakeSocket();
    renderHook(() =>
      useHints({ socket: socket as unknown as Socket, playerCount: 1, gameActive: true }),
    );

    const payload: HintPayload = {
      hint: 'Starts with Q',
      hintType: 'firstLetter',
      hintsRemaining: 2,
      firstLetter: 'Q',
    } as HintPayload;

    act(() => {
      (socket as unknown as { __emit: (e: string, p: unknown) => void }).__emit(
        'hintResponse',
        payload,
      );
    });

    expect(trackHintUsed).toHaveBeenCalledTimes(1);
    expect(trackHintUsed).toHaveBeenCalledWith('singleplayer', 'firstLetter');
  });

  it('uses the mode passed into useHints when provided', () => {
    const socket = createFakeSocket();
    renderHook(() =>
      useHints({
        socket: socket as unknown as Socket,
        playerCount: 1,
        gameActive: true,
        mode: 'adventure',
      } as Parameters<typeof useHints>[0]),
    );

    const payload: HintPayload = {
      hint: '5 letters',
      hintType: 'length',
      hintsRemaining: 1,
      wordLength: 5,
    } as HintPayload;

    act(() => {
      (socket as unknown as { __emit: (e: string, p: unknown) => void }).__emit(
        'hintResponse',
        payload,
      );
    });

    expect(trackHintUsed).toHaveBeenCalledWith('adventure', 'length');
  });

  it('does not fire when requestHint emits but no response arrives', () => {
    const socket = createFakeSocket();
    const { result } = renderHook(() =>
      useHints({ socket: socket as unknown as Socket, playerCount: 1, gameActive: true }),
    );

    act(() => {
      result.current.requestHint();
    });

    expect(socket.emit).toHaveBeenCalledWith('requestHint');
    expect(trackHintUsed).not.toHaveBeenCalled();
  });

  it('does not fire on hintError', () => {
    const socket = createFakeSocket();
    renderHook(() =>
      useHints({ socket: socket as unknown as Socket, playerCount: 1, gameActive: true }),
    );

    act(() => {
      (socket as unknown as { __emit: (e: string, p: unknown) => void }).__emit('hintError', {
        message: 'No hints left',
      });
    });

    expect(trackHintUsed).not.toHaveBeenCalled();
  });
});
