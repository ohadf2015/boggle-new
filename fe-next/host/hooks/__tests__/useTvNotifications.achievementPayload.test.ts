import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTvNotifications } from '../useTvNotifications';

vi.mock('../../components/tv-broadcast/TvNotification', () => ({
  NOTIFICATION_LAYOUTS: { achievement: 'left-mascot' },
  NOTIFICATION_MASCOTS: { achievement: 'excited' },
}));

/**
 * Sentry JAVASCRIPT-NEXTJS-247 — 32 crashes in 40s on /multiplayer for the one
 * paying teacher. The TV-broadcast hook declared its own payload shape
 * (`{ username, achievement: { name } }`) but the server emits
 * `liveAchievementUnlocked` as `{ achievements: [{ key, icon, count? }] }`
 * (shared/types/socket.ts). `achievement` was always undefined, so `.name`
 * threw on every event — and socket.io replays buffered events on reconnect,
 * hence the burst. The hook must consume the real shape and survive junk.
 */
describe('useTvNotifications — liveAchievementUnlocked payload', () => {
  const createMockSocket = () => {
    const handlers: Record<string, (data: unknown) => void> = {};
    return {
      on: vi.fn((event: string, handler: (data: unknown) => void) => { handlers[event] = handler; }),
      off: vi.fn(),
      _trigger: (event: string, data: unknown) => { handlers[event]?.(data); },
    };
  };
  const t = (key: string) => key;

  it('reads the server shape ({ key, icon }) without throwing', () => {
    const socket = createMockSocket();
    const { result } = renderHook(() => useTvNotifications({ socket: socket as never, enabled: true, t }));

    expect(() => {
      act(() => socket._trigger('liveAchievementUnlocked', { achievements: [{ key: 'word_master', icon: '🏆', count: 1 }] }));
    }).not.toThrow();

    const notifs = result.current.notifications.filter((n) => n.type === 'achievement');
    expect(notifs).toHaveLength(1);
    expect(notifs[0].headline).toBe('tvBroadcast.notifications.achievement');
    expect(notifs[0].subtext).toContain('word_master');
  });

  it('ignores malformed entries and an empty envelope', () => {
    const socket = createMockSocket();
    const { result } = renderHook(() => useTvNotifications({ socket: socket as never, enabled: true, t }));

    expect(() => {
      act(() => socket._trigger('liveAchievementUnlocked', { achievements: [undefined, {}, { key: 42 }] }));
      act(() => socket._trigger('liveAchievementUnlocked', {}));
      act(() => socket._trigger('liveAchievementUnlocked', null));
    }).not.toThrow();

    expect(result.current.notifications.filter((n) => n.type === 'achievement')).toHaveLength(0);
  });
});
