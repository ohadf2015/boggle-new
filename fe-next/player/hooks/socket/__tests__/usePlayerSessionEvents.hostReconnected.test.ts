import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const neoInfoToast = vi.fn();
vi.mock('../../../../components/NeoToast', () => ({
  neoInfoToast: (...a: unknown[]) => neoInfoToast(...a),
  wordErrorToast: vi.fn(),
  TOAST_ICONS: {},
}));
vi.mock('@/hooks/gameState', () => ({
  useGameActions: () => ({
    setPlayers: vi.fn(),
    setShufflingGrid: vi.fn(),
    setHighlightedCells: vi.fn(),
    setAchievements: vi.fn(),
    setLeaderboard: vi.fn(),
    setXpGainedData: vi.fn(),
    setLevelUpData: vi.fn(),
  }),
}));

import { usePlayerSessionEvents } from '../usePlayerSessionEvents';

type Handler = (...args: unknown[]) => void;
function makeMockSocket() {
  const handlers: Record<string, Handler[]> = {};
  return {
    on: (e: string, cb: Handler) => void (handlers[e] ||= []).push(cb),
    off: (e: string, cb: Handler) => void (handlers[e] = (handlers[e] || []).filter((h) => h !== cb)),
    __fire: (e: string, ...a: unknown[]) => (handlers[e] || []).forEach((h) => h(...a)),
    __count: (e: string) => (handlers[e] || []).length,
  };
}

const mount = (socket: ReturnType<typeof makeMockSocket>) =>
  renderHook(() =>
    usePlayerSessionEvents({
      socket: socket as never,
      t: (k: string) => k,
      username: 'me',
      queueAchievement: vi.fn(),
      intentionalExitRef: { current: false },
    }),
  );

describe('usePlayerSessionEvents — host is back', () => {
  beforeEach(() => neoInfoToast.mockClear());

  it('answers the "host dropped" toast with an all-clear when the host reconnects', () => {
    const socket = makeMockSocket();
    mount(socket);
    socket.__fire('hostReconnected', { username: 'Ms Cohen' });
    expect(neoInfoToast).toHaveBeenCalledWith('playerView.hostReconnected', expect.anything());
  });

  it('unregisters on unmount', () => {
    const socket = makeMockSocket();
    const { unmount } = mount(socket);
    expect(socket.__count('hostReconnected')).toBe(1);
    unmount();
    expect(socket.__count('hostReconnected')).toBe(0);
  });
});
