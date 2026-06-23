import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';

// Cut heavy/irrelevant import chains so the hook loads in isolation.
vi.mock('../../../../components/NeoToast', () => ({
  neoInfoToast: vi.fn(),
  wordErrorToast: vi.fn(),
  TOAST_ICONS: {},
}));

import { usePlayerSessionEvents } from '../usePlayerSessionEvents';

// Capture the Zustand action setters the hook drives.
const setPlayers = vi.fn();
vi.mock('@/hooks/gameState', () => ({
  useGameActions: () => ({
    setPlayers,
    setShufflingGrid: vi.fn(),
    setHighlightedCells: vi.fn(),
    setAchievements: vi.fn(),
    setLeaderboard: vi.fn(),
    setXpGainedData: vi.fn(),
    setLevelUpData: vi.fn(),
  }),
}));

type Handler = (...args: unknown[]) => void;

function makeMockSocket() {
  const handlers: Record<string, Handler[]> = {};
  return {
    on: (event: string, cb: Handler) => {
      (handlers[event] ||= []).push(cb);
    },
    off: (event: string, cb: Handler) => {
      handlers[event] = (handlers[event] || []).filter((h) => h !== cb);
    },
    __fire: (event: string, ...args: unknown[]) =>
      (handlers[event] || []).forEach((h) => h(...args)),
    __count: (event: string) => (handlers[event] || []).length,
  };
}

function mountWith(socket: ReturnType<typeof makeMockSocket>) {
  return renderHook(() =>
    usePlayerSessionEvents({
      socket: socket as never,
      t: (k: string) => k,
      username: 'me',
      queueAchievement: vi.fn(),
      intentionalExitRef: { current: false },
    }),
  );
}

describe('usePlayerSessionEvents — playerListUpdate (guest-rename roster refresh)', () => {
  beforeEach(() => setPlayers.mockClear());

  it('refreshes the roster when the server broadcasts playerListUpdate (the rename event)', () => {
    const socket = makeMockSocket();
    mountWith(socket);

    // The rename handler re-keys game.users and broadcasts `playerListUpdate`
    // with the NEW names. The roster must adopt them so display-name-keyed
    // features (lobby emote face-swaps) keep matching.
    const renamed = [{ username: 'NewName' }] as never;
    socket.__fire('playerListUpdate', { users: renamed });

    expect(setPlayers).toHaveBeenCalledWith(renamed);
  });

  it('handles playerListUpdate identically to updateUsers (throttled, freshest wins)', () => {
    vi.useFakeTimers();
    try {
      const socket = makeMockSocket();
      mountWith(socket);

      // Leading edge: first roster update applies immediately.
      socket.__fire('updateUsers', { users: [{ username: 'A' }] as never });
      expect(setPlayers).toHaveBeenCalledTimes(1);

      // Second update within the 150ms window is coalesced into a trailing flush
      // carrying the freshest payload — not dropped, just deferred.
      socket.__fire('playerListUpdate', { users: [{ username: 'B' }] as never });
      expect(setPlayers).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(150);
      expect(setPlayers).toHaveBeenCalledTimes(2);
      expect(setPlayers).toHaveBeenLastCalledWith([{ username: 'B' }]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('unregisters its playerListUpdate listener on unmount', () => {
    const socket = makeMockSocket();
    const { unmount } = mountWith(socket);
    expect(socket.__count('playerListUpdate')).toBe(1);
    unmount();
    expect(socket.__count('playerListUpdate')).toBe(0);
  });
});
