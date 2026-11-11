import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTvNotifications } from '../useTvNotifications';
import { STALE_CALLOUT_MS } from '../../components/tv-broadcast/standingsCallouts';

vi.mock('../../components/tv-broadcast/TvNotification', () => ({
  NOTIFICATION_LAYOUTS: { photo_finish: 'center-highlight', overtake: 'left-mascot', comeback: 'center-highlight', long_word: 'left-mascot', first_blood: 'center-highlight' },
  NOTIFICATION_MASCOTS: { photo_finish: 'surprised', overtake: 'happy', comeback: 'excited', long_word: 'happy', first_blood: 'excited' },
}));

const createMockSocket = () => {
  const handlers: Record<string, (data: unknown) => void> = {};
  return {
    on: vi.fn((event: string, handler: (data: unknown) => void) => { handlers[event] = handler; }),
    off: vi.fn(),
    _trigger: (event: string, data: unknown) => { handlers[event]?.(data); },
  };
};
const t = (key: string) => key;

function setup() {
  const socket = createMockSocket();
  const hook = renderHook(() => useTvNotifications({ socket: socket as never, enabled: true, t }));
  act(() => socket._trigger('startGame', {}));
  const board = (leaderboard: Array<{ username: string; score: number }>) =>
    act(() => socket._trigger('updateLeaderboard', { leaderboard }));
  const pills = () => hook.result.current.notifications.filter((n) => n.type === 'photo_finish');
  return { socket, hook, board, pills };
}

describe('useTvNotifications — neck and neck', () => {
  afterEach(() => vi.useRealTimers());

  it('does not call a race when the first scorer leads a pupil still on zero', () => {
    const { board, pills } = setup();
    board([{ username: 'QA R2 1', score: 3 }, { username: 'QA R2 2', score: 0 }, { username: 'QA R2 3', score: 0 }]);
    expect(pills()).toHaveLength(0);
  });

  it('pairs the real top two even when the payload is not in score order', () => {
    const { board, pills } = setup();
    board([{ username: 'A', score: 40 }, { username: 'B', score: 8 }, { username: 'C', score: 45 }]);
    expect(pills()).toHaveLength(1);
    expect(pills()[0].player).toBe('C vs A');
  });

  it('takes the pill down once the scores pull apart', () => {
    const { board, pills } = setup();
    board([{ username: 'A', score: 20 }, { username: 'B', score: 17 }]);
    expect(pills()).toHaveLength(1);
    board([{ username: 'A', score: 51 }, { username: 'B', score: 17 }]);
    expect(pills()).toHaveLength(0);
  });

  it('skips a queued callout that waited past the stale window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const { socket, hook } = setup();
    act(() => socket._trigger('playerFoundWordBatch', { words: [{ username: 'A', wordCount: 1, word: 'CAT' }] }));
    vi.setSystemTime(1_000_000 + 11_000);
    act(() => socket._trigger('playerFoundWordBatch', { words: [{ username: 'B', wordCount: 1, word: 'TABLE' }] }));
    const [head] = hook.result.current.notifications;
    expect(hook.result.current.notifications).toHaveLength(2);
    vi.setSystemTime(1_000_000 + 11_000 + STALE_CALLOUT_MS + 1);
    act(() => hook.result.current.dismissNotification(head.id));
    expect(hook.result.current.notifications).toEqual([]);
  });
});
