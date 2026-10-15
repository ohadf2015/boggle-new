import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHostPlayerEvents } from '@/host/hooks/socket/useHostPlayerEvents';

function fakeSocket() {
  const events = new Set<string>();
  return { on: (e: string) => events.add(e), off: (e: string) => events.delete(e), events };
}

const setters = () => ({
  t: (k: string) => k,
  queueAchievement: vi.fn(),
  setPlayersReady: vi.fn(),
  setPlayerWordCounts: vi.fn(),
  setPlayerScores: vi.fn(),
  setPlayerAchievements: vi.fn(),
  setHostAchievements: vi.fn(),
  setXpGainedData: vi.fn(),
  setLevelUpData: vi.fn(),
});

describe('useHostPlayerEvents — XP on the projector', () => {
  it('given a broadcast host (projector), when the room runs, then no XP or level toasts are wired', () => {
    const socket = fakeSocket();
    renderHook(() => useHostPlayerEvents({ socket: socket as never, hostPlaying: false, ...setters() }));
    expect(socket.events.has('xpGained')).toBe(false);
    expect(socket.events.has('levelUp')).toBe(false);
    expect(socket.events.has('updateUsers')).toBe(true);
  });

  it('given a host who plays on their own device, when the room runs, then their XP still celebrates', () => {
    const socket = fakeSocket();
    renderHook(() => useHostPlayerEvents({ socket: socket as never, hostPlaying: true, ...setters() }));
    expect(socket.events.has('xpGained')).toBe(true);
    expect(socket.events.has('levelUp')).toBe(true);
  });
});
