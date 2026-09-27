/**
 * REMATCH is a handshake now, and this hook is the client half of it.
 *
 * Round 3 navigated the tapper straight into a duel the other student had not
 * agreed to. Both tapped, both navigated, both waited — the flow the blind
 * critic disqualified. The contract here: a tap NEVER navigates on its own, an
 * offer from the other side is visible, and the one duel the server creates
 * takes BOTH of us there.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDuelRematch } from '../useDuelRematch';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

type Cb<T> = (data: T) => void;

function makeBus() {
  const listeners: Record<string, Cb<unknown>[]> = {};
  const on = (event: string) => (cb: Cb<never>) => {
    (listeners[event] ||= []).push(cb as Cb<unknown>);
    return () => {
      listeners[event] = (listeners[event] || []).filter((l) => l !== cb);
    };
  };
  const fire = (event: string, data: unknown) =>
    act(() => {
      for (const cb of listeners[event] || []) cb(data);
    });
  return { on, fire };
}

describe('useDuelRematch', () => {
  const emit = vi.fn();

  function setup(overrides: Record<string, unknown> = {}) {
    const bus = makeBus();
    const hook = renderHook(() =>
      useDuelRematch({
        socket: { emit },
        opponentId: 'opponent-1',
        lessonId: 'lesson-1',
        duelId: 'duel-1',
        onDuelCreated: bus.on('duel:created'),
        onError: bus.on('duel:error'),
        onRematchOffered: bus.on('duel:rematch-offered'),
        onRematchPending: bus.on('duel:rematch-pending'),
        onRematchInvited: bus.on('duel:rematch-invited'),
        onRematchWithdrawn: bus.on('duel:rematch-withdrawn'),
        ...overrides,
      })
    );
    return { ...hook, bus };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
  });

  it('carries the finished duel id so the server can find the classroom', () => {
    const { result } = setup();
    act(() => result.current.requestRematch());

    expect(emit).toHaveBeenCalledWith('duel:rematch', {
      opponentId: 'opponent-1',
      lessonId: 'lesson-1',
      duelId: 'duel-1',
    });
  });

  it('waits instead of navigating — a tap alone must not move the screen', () => {
    const { result, bus } = setup();
    act(() => result.current.requestRematch());
    bus.fire('duel:rematch-pending', { opponentId: 'opponent-1', expiresInMs: 45000 });

    expect(result.current.state).toBe('pending');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows that the OTHER student asked first, by name', () => {
    const { result, bus } = setup();
    bus.fire('duel:rematch-offered', { fromUserId: 'opponent-1', fromName: 'Maya' });

    expect(result.current.state).toBe('offered');
    expect(result.current.offeredByName).toBe('Maya');
  });

  it('ignores an offer from someone else\'s duel', () => {
    const { result, bus } = setup();
    bus.fire('duel:rematch-offered', { fromUserId: 'stranger', fromName: 'Nobody' });

    expect(result.current.state).toBe('idle');
  });

  it('goes to the one duel the server created for both of us', () => {
    const { result, bus } = setup();
    act(() => result.current.requestRematch());
    bus.fire('duel:created', { duelId: 'duel-2', isRematch: true });

    expect(mockPush).toHaveBeenCalledWith('/en/education/duels/duel-2');
  });

  it('follows an agreed rematch even if this device gave up waiting', () => {
    // The server only creates a rematch when BOTH students asked for it, so a
    // local timeout must never leave one of them behind in an empty room.
    const { bus } = setup();
    bus.fire('duel:created', { duelId: 'duel-2', isRematch: true });

    expect(mockPush).toHaveBeenCalledWith('/en/education/duels/duel-2');
  });

  it('does not hijack a duel created somewhere else in the app', () => {
    const { bus } = setup();
    bus.fire('duel:created', { duelId: 'duel-9' });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('reports an invite when the opponent has already left', () => {
    const { result, bus } = setup();
    act(() => result.current.requestRematch());
    bus.fire('duel:rematch-invited', { duelId: 'duel-3', opponentId: 'opponent-1' });

    expect(result.current.state).toBe('invited');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('withdraws the offer on cancel and tells the server', () => {
    const { result, bus } = setup();
    act(() => result.current.requestRematch());
    bus.fire('duel:rematch-pending', { opponentId: 'opponent-1', expiresInMs: 45000 });

    act(() => result.current.cancelRematch());

    expect(emit).toHaveBeenCalledWith('duel:rematch-cancel', {
      opponentId: 'opponent-1',
      lessonId: 'lesson-1',
    });
    expect(result.current.state).toBe('idle');
  });

  it('clears the ask when the other student withdraws', () => {
    const { result, bus } = setup();
    bus.fire('duel:rematch-offered', { fromUserId: 'opponent-1', fromName: 'Maya' });
    bus.fire('duel:rematch-withdrawn', { fromUserId: 'opponent-1' });

    expect(result.current.state).toBe('idle');
  });

  it('has no rematch to offer in an async duel with no opponent id', () => {
    const { result } = setup({ opponentId: undefined });
    expect(result.current.canRematch).toBe(false);
  });

  it('survives a socket hook that is missing the new listeners', () => {
    // A duel screen must never white-screen because one subscription is absent.
    const { result } = setup({
      onRematchOffered: undefined,
      onRematchPending: undefined,
      onRematchInvited: undefined,
      onRematchWithdrawn: undefined,
    });
    expect(result.current.state).toBe('idle');
    act(() => result.current.requestRematch());
    expect(emit).toHaveBeenCalled();
  });
});
