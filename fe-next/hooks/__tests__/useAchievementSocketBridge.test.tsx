/**
 * @vitest-environment happy-dom
 *
 * useAchievementSocketBridge Hook Tests
 *
 * Bridges socket achievement events to the global AchievementQueueProvider.
 * Two events:
 *  - liveAchievementUnlocked: { achievements: AchievementPayload[] } — mid-game unlocks
 *  - lifetimeAchievementsUnlocked: { achievements: AchievementPayload[] } — career milestones
 *
 * Without this bridge, MP players never see toasts even though server emits them.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { EventEmitter } from 'events';
import { useAchievementSocketBridge } from '../useAchievementSocketBridge';
import { midRoundEventQueueStore } from '../useMidRoundEventQueue';

const queueAchievementMock = vi.fn();
let gameActiveMock = false;

vi.mock('@/components/achievements', () => ({
  useAchievementQueue: () => ({ queueAchievement: queueAchievementMock }),
}));

vi.mock('@/hooks/gameState', () => ({
  useGameActive: () => gameActiveMock,
}));

type FakeSocket = EventEmitter;

function makeSocket(): FakeSocket {
  return new EventEmitter();
}

describe('useAchievementSocketBridge', () => {
  beforeEach(() => {
    queueAchievementMock.mockClear();
    gameActiveMock = false;
    act(() => midRoundEventQueueStore.getState().clear());
  });

  it('queues each achievement when liveAchievementUnlocked fires', () => {
    const socket = makeSocket();
    renderHook(() => useAchievementSocketBridge(socket as unknown as import('socket.io-client').Socket));

    socket.emit('liveAchievementUnlocked', {
      achievements: [
        { key: 'FIRST_BLOOD', icon: '🎯' },
        { key: 'WORD_MASTER', icon: '📚' },
      ],
    });

    expect(queueAchievementMock).toHaveBeenCalledTimes(2);
    expect(queueAchievementMock).toHaveBeenNthCalledWith(1, { key: 'FIRST_BLOOD', icon: '🎯' });
    expect(queueAchievementMock).toHaveBeenNthCalledWith(2, { key: 'WORD_MASTER', icon: '📚' });
  });

  it('queues each achievement when lifetimeAchievementsUnlocked fires', () => {
    const socket = makeSocket();
    renderHook(() => useAchievementSocketBridge(socket as unknown as import('socket.io-client').Socket));

    socket.emit('lifetimeAchievementsUnlocked', {
      achievements: [{ key: 'VETERAN', icon: '🎖️' }],
    });

    expect(queueAchievementMock).toHaveBeenCalledTimes(1);
    expect(queueAchievementMock).toHaveBeenCalledWith({ key: 'VETERAN', icon: '🎖️' });
  });

  it('ignores empty payloads', () => {
    const socket = makeSocket();
    renderHook(() => useAchievementSocketBridge(socket as unknown as import('socket.io-client').Socket));

    socket.emit('liveAchievementUnlocked', { achievements: [] });
    socket.emit('lifetimeAchievementsUnlocked', {});
    socket.emit('liveAchievementUnlocked', null);

    expect(queueAchievementMock).not.toHaveBeenCalled();
  });

  it('does not throw when socket is null', () => {
    expect(() => {
      renderHook(() => useAchievementSocketBridge(null));
    }).not.toThrow();
  });

  it('removes listeners on unmount', () => {
    const socket = makeSocket();
    const { unmount } = renderHook(() => useAchievementSocketBridge(socket as unknown as import('socket.io-client').Socket));

    unmount();
    socket.emit('liveAchievementUnlocked', {
      achievements: [{ key: 'FIRST_BLOOD', icon: '🎯' }],
    });

    expect(queueAchievementMock).not.toHaveBeenCalled();
  });

  describe('mid-round defer (gameActive=true)', () => {
    it('enqueues to MidRoundEventQueue instead of toast when gameActive', () => {
      gameActiveMock = true;
      const socket = makeSocket();
      renderHook(() => useAchievementSocketBridge(socket as unknown as import('socket.io-client').Socket));

      socket.emit('liveAchievementUnlocked', {
        achievements: [
          { key: 'FIRST_BLOOD', icon: '🎯', count: 1 },
          { key: 'WORD_MASTER', icon: '📚' },
        ],
      });

      expect(queueAchievementMock).not.toHaveBeenCalled();
      const events = midRoundEventQueueStore.getState().events;
      expect(events.length).toBe(2);
      expect(events[0]).toEqual({
        kind: 'achievementUnlocked',
        payload: { key: 'FIRST_BLOOD', icon: '🎯', count: 1 },
      });
      expect(events[1]).toEqual({
        kind: 'achievementUnlocked',
        payload: { key: 'WORD_MASTER', icon: '📚' },
      });
    });

    it('also enqueues lifetime achievements when gameActive', () => {
      gameActiveMock = true;
      const socket = makeSocket();
      renderHook(() => useAchievementSocketBridge(socket as unknown as import('socket.io-client').Socket));

      socket.emit('lifetimeAchievementsUnlocked', {
        achievements: [{ key: 'VETERAN', icon: '🎖️' }],
      });

      expect(queueAchievementMock).not.toHaveBeenCalled();
      expect(midRoundEventQueueStore.getState().events.length).toBe(1);
    });

    it('toasts as before when gameActive=false (lobby/results)', () => {
      gameActiveMock = false;
      const socket = makeSocket();
      renderHook(() => useAchievementSocketBridge(socket as unknown as import('socket.io-client').Socket));

      socket.emit('liveAchievementUnlocked', {
        achievements: [{ key: 'FIRST_BLOOD', icon: '🎯' }],
      });

      expect(queueAchievementMock).toHaveBeenCalledTimes(1);
      expect(midRoundEventQueueStore.getState().events).toEqual([]);
    });
  });

  it('re-binds when socket instance changes', () => {
    const first = makeSocket();
    const second = makeSocket();

    const { rerender } = renderHook(
      ({ s }: { s: FakeSocket }) =>
        useAchievementSocketBridge(s as unknown as import('socket.io-client').Socket),
      { initialProps: { s: first } }
    );

    rerender({ s: second });

    first.emit('liveAchievementUnlocked', {
      achievements: [{ key: 'OLD', icon: '🎯' }],
    });
    second.emit('liveAchievementUnlocked', {
      achievements: [{ key: 'NEW', icon: '⭐' }],
    });

    expect(queueAchievementMock).toHaveBeenCalledTimes(1);
    expect(queueAchievementMock).toHaveBeenCalledWith({ key: 'NEW', icon: '⭐' });
  });
});
