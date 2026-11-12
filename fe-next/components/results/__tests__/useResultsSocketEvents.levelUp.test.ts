import { renderHook, act } from '@testing-library/react';
import type { Socket } from 'socket.io-client';
import { useResultsSocketEvents } from '../useResultsSocketEvents';

const publishLevelUp = vi.fn();
vi.mock('@/lib/avatar/revealTrigger', () => ({ publishLevelUp: (...a: unknown[]) => publishLevelUp(...a) }));
vi.mock('@/utils/logger', () => ({ __esModule: true, default: { log: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));
vi.mock('@/components/NeoToast', () => ({ neoInfoToast: vi.fn() }));

function mockSocket() {
  const listeners: Record<string, Array<(d: unknown) => void>> = {};
  return {
    listeners,
    connected: true,
    emit: vi.fn(),
    on: vi.fn((e: string, cb: (d: unknown) => void) => {
      (listeners[e] ??= []).push(cb);
    }),
    off: vi.fn((e: string, cb: (d: unknown) => void) => {
      listeners[e] = (listeners[e] ?? []).filter((x) => x !== cb);
    }),
  };
}

describe('useResultsSocketEvents — follow-up level-ups', () => {
  beforeEach(() => publishLevelUp.mockReset());

  it('announces the higher level a quest level-up reaches after the game level-up', () => {
    const socket = mockSocket();
    const { result } = renderHook(() => useResultsSocketEvents({ socket: socket as unknown as Socket }));
    const fire = (d: unknown) => act(() => socket.listeners.levelUp.forEach((cb) => cb(d)));

    fire({ oldLevel: 4, newLevel: 5 });
    fire({ oldLevel: 4, newLevel: 7 });

    expect(publishLevelUp).toHaveBeenCalledTimes(2);
    expect(publishLevelUp).toHaveBeenLastCalledWith({ oldLevel: 4, newLevel: 7 }, 'multiplayer');
    expect(result.current.levelUpData).toEqual({ oldLevel: 4, newLevel: 7 });
  });

  it('ignores a repeat of a level already shown', () => {
    const socket = mockSocket();
    renderHook(() => useResultsSocketEvents({ socket: socket as unknown as Socket }));
    const fire = (d: unknown) => act(() => socket.listeners.levelUp.forEach((cb) => cb(d)));

    fire({ oldLevel: 4, newLevel: 5 });
    fire({ oldLevel: 4, newLevel: 5 });

    expect(publishLevelUp).toHaveBeenCalledTimes(1);
  });
});
